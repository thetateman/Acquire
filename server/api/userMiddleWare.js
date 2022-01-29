const express = require('express');
const UserModel = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');


class UserMiddleware{
  static async createUserMiddleware(req, res, next) {
      require('dotenv').config();
      const connection = mongoose.connect(process.env.RESTREVIEWS_DB_URI)
      .then(()=>console.log('connected'))
      .catch(e=>console.log(e));


    
      console.log(JSON.stringify(req.body));
      console.log(req.body.password);

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
      
      user = new UserModel({
        username,
        email,
        password: hashedPassword
      });
      
      await user.save();
      return res.json({ result: "" });
  };
  static async loginUserMiddleware(req, res, next){
      console.log("hit");
      require('dotenv').config();
      const connection = mongoose.connect(process.env.RESTREVIEWS_DB_URI)
      .then(()=>console.log('connected'))
      .catch(e=>console.log(e));

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
        return res.json({ result: "pass" });
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