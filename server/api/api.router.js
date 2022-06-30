const express = require('express');
const UserModel = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
const UserMiddleware = require('./userMiddleWare.js');

const router = express.Router();
router
    .route("/createUser")
    .post(UserMiddleware.createUserMiddleware);

router
    .route("/loginUser")
    .post(UserMiddleware.loginUserMiddleware);

router
    .route("/logoutUser")
    .delete(UserMiddleware.logoutUserMiddleware);

/* ---------------Other express router examples-------------------
router.route("/").get(RestaurantsCtrl.apiGetRestaurants)
router.route("/id/:id").get(RestaurantsCtrl.apiGetRestaurantById)
router.route("/cuisines").get(RestaurantsCtrl.apiGetRestaurantCuisines)

router
  .route("/review")
  .post(ReviewsCtrl.apiPostReview)
  .put(ReviewsCtrl.apiUpdateReview)
  .delete(ReviewsCtrl.apiDeleteReview)

router
  .route("/login")
  .post(UserCtrl.apiPostUser)

router
  .route("/game")
  .get(GameCtrl.apiGetGames)
  .post(GameCtrl.apiPostGameAction)
*/

module.exports = router;