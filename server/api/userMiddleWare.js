const express = require('express');
const UserModel = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');


class UserMiddleware{
  static async createUserMiddleware(req, res, next) {
      require('dotenv').config();
      const connection = mongoose.connect(process.env.RESTREVIEWS_DB_URI)
      .then(()=>{})
      .catch(e=>console.error(e));

      const { username, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);

      let responseObj = {error: "none", user: {}};

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
        password: hashedPassword
      });
      
      await user.save();
      responseObj.user = user;
      responseObj.user.password = "";
      return res.json(responseObj);
      return res.json({ result: "" });
  };
  static async loginUserMiddleware(req, res, next){
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
  };

  static async logoutUserMiddleware(req, res, next){
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
  }
}
module.exports = UserMiddleware;