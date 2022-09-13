const express = require('express');
const UserModel = require("../models/User");
const GameModel = require("../models/Game.js");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');


const UserMiddleware = {
  createUserMiddleware: async function(req, res, next) {
      function usernameAllowed(str) {
        const bannedUsernames = ['Server', 'server', 'admin', 'Admin', 'lobby', 'COMMAND_RUN', 'everyone'];
         if(!(/^[\x30-\x3B\x41-\x7A]{3,35}$/.test(str))){
          return false;
         }
         if(bannedUsernames.includes(str)){
          return false;
         }
         return true;
      }
      function emailAllowed(str) {
        if(!(/^[\x21-\x3B\x40-\x7E]{1,99}$/.test(str))){
         return false;
        }
        return true;
     }  
      require('dotenv').config();
      const connection = mongoose.connect(process.env.RESTREVIEWS_DB_URI)
      .then(()=>{})
      .catch(e=>console.error(e));

      const { username, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);

      let responseObj = {error: "none", user: {}};
      if(!usernameAllowed(username)){
        responseObj.error = "invalidUsername";
        return res.json(responseObj);
      }
      if(!emailAllowed(email)){
        responseObj.error = "invalidEmail";
        return res.json(responseObj);
      }

      let user = await UserModel.findOne({email})
      if(user) {
        responseObj.error = "dupEmail";
        return res.json(responseObj);
      }
      user = await UserModel.findOne({username})
      if(user) {
        responseObj.error = "dupUsername";
        return res.json(responseObj);
      } 
      req.session.isAuth = true;
      req.session.username = username;
      req.session.lastKnownLocation = 'login';
      
      
      user = new UserModel({
        username,
        email,
        password: hashedPassword,
        associated_ip_addresses: [req.ip]
      });
      
      await user.save();
      responseObj.user = user;
      responseObj.user.password = "";
      return res.json(responseObj);
      return res.json({ result: "" });
  },
  
  loginUserMiddleware: async function(req, res, next){

   
   function loginAllowed(str) {
     if(!(/^[\x21-\x3B\x40-\x7E]{1,99}$/.test(str))){
      return false;
     }
     return true;
    };  

    require('dotenv').config();
    const connection = mongoose.connect(process.env.RESTREVIEWS_DB_URI)
    .then(()=>{})
    .catch(e=>console.error(e));

    const {loginID, password} = req.body;
    let loginType;
    if (loginID.includes('@')){
        loginType = 'email';
    } else {
        loginType = 'username';
    }
    const username = loginID;
    const email = loginID;
    
    let responseObj = {error: "none", user: {}};

    if(!loginAllowed(loginID)){
      responseObj.error = "wrongLoginID";
      return res.json(responseObj);
    }
    
    let user;
    if(loginType === 'email'){
        user = await UserModel.findOne({email})
    } else {
        user = await UserModel.findOne({username})
    }
    if(!user){
        responseObj.error = "wrongLoginID";
        return res.json(responseObj);
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
        responseObj.error = "wrongPassword";
        return res.json(responseObj);
    } else {
        req.session.isAuth = true;
        req.session.username = user.username;
        req.session.lastKnownLocation = 'login';
        responseObj.user = user;
        responseObj.user.password = "";
        return res.json(responseObj);
    }
  },

  logoutUserMiddleware: async function(req, res, next){
    if(req.session){
      req.session.destroy(err => {
        if(err){
          res.status(400).send("Unable to log out.")
        } else {
          res.json({"message": "logout successful"}).send();
        }
      });
    } else {
      res.end();
    }
  },

  
  searchUserMiddleware: async function(req, res, next){
    let responseObj = {error: "none", user: {}};
    let selectString = 'username date_created';
    for(let i=2; i<7; i++){
      selectString += ` p${i}_skill p${i}_record p${i}games_stalled`;
    }
    let result = await UserModel.findOne({username: req.query.username}).select(selectString); 
    if(!result){
      responseObj.error = 'userNotFound';
    }
    responseObj.user = result;
    return res.json(responseObj);

  },

  getLadderMiddleware: async function(req, res, next){
    let result;
    let resultCountLimit;
    let projectObj = {};
    let responseObj = {error: "none", users: []};
    const numPlayersCode = parseInt(req.query.numplayers, 10);
    if(numPlayersCode === 0){
      for(let i = 2; i < 7; i++){
        responseObj.users.push(await UserMiddleware.getSimpleLadder(i));
      }
      return res.json(responseObj);
    }
    let numPlayers = numPlayersCode;
    if(numPlayersCode < 0){
      numPlayers = numPlayersCode * -1;
      result = await UserMiddleware.getSimpleLadder(numPlayers);
      responseObj.users = result;
      return res.json(responseObj);
    }
    else if(1 < numPlayersCode < 7){
      resultCountLimit = 99999;
      projectObj = {
        "_id": 0,
        username: 1,
        date_created: 1,
        [`p${numPlayers}games_stalled`]: 1,
        [`p${numPlayers}_skill`]: 1,
        [`p${numPlayers}_record`]: 1,        
        conSkill: { // calculate conservative skill estimate
          $sum: [
            {$arrayElemAt: [`$p${numPlayers}_skill`, 0]},
            {$multiply: [
              {$arrayElemAt: [`$p${numPlayers}_skill`, 1]}, {$literal: -3}
            ]}
          ]
        }
      };
    }
    
    try{
      result = await UserModel.aggregate([
        {"$match":{"$expr":{"$gt":[{"$sum":`$p${numPlayers}_record`}, 0]}}},
        {"$project": projectObj},
        {"$sort":{conSkill: -1, _id: -1}}, // Return users sorted by conservative skill estimate
        {"$limit": resultCountLimit}
      ]); 
    }
    catch(err){
      console.error("Problem getting users for ladder");
      console.error(err);
    }  
    responseObj.users = result;
    return res.json(responseObj);

  },

  getSimpleLadder: async function(numPlayers){
    let result;
    const resultCountLimit = 50;
    const projectObj = {
        "_id": 0,
        username: 1,       
        conSkill: { // calculate conservative skill estimate
          $sum: [
            {$arrayElemAt: [`$p${numPlayers}_skill`, 0]},
            {$multiply: [
              {$arrayElemAt: [`$p${numPlayers}_skill`, 1]}, {$literal: -3}
            ]}
          ]
        }
      };

    try{
      result = await UserModel.aggregate([
        {"$match":{"$expr":{"$gt":[{"$sum":`$p${numPlayers}_record`}, 0]}}},
        {"$project": projectObj},
        {"$sort":{conSkill: -1, _id: -1}}, // Return users sorted by conservative skill estimate
        {"$limit": resultCountLimit}
      ]); 
    }
    catch(err){
      console.error("Problem getting users for ladder");
      console.error(err);
    } 
    return result;
  },
}
module.exports = UserMiddleware;