const express = require('express');
const UserModel = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');


const GameMiddleware = {
  retrieveAllActiveGames: async function(req, res, next) {
      require('dotenv').config();
      const connection = mongoose.connect(process.env.RESTREVIEWS_DB_URI)
      .then(()=>{})
      .catch(e=>console.error(e));

      const { username, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);

      
      let user = await UserModel.findOne({email})
      if(user) {
        return res.json({ result: "dupEmail" });
      }
      user = await UserModel.findOne({username})
      if(user) {
        return res.json({ result: "dupUsername" });
      } 
      req.session.isAuth = true;
      req.session.username = username;
      
      user = new UserModel({
        username,
        email,
        password: hashedPassword
      });
      
      await user.save();
      return res.json({ result: "" });
  },

  loginUserMiddleware: async function(req, res, next){
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
    
    
    let user;
    if(loginType === 'email'){
        user = await UserModel.findOne({email})
    } else {
        user = await UserModel.findOne({username})
    }
    if(!user){
        return res.json({ result: "wrongLoginID" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
        return res.json({ result: "wrongPassword" });
    } else {
        req.session.isAuth = true;
        req.session.username = username;
        return res.json({ result: "pass" });
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
}
module.exports = GameMiddleware;