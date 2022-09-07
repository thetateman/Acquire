"use strict";

const trueskill = require("trueskill");

const UserModel = require("../models/User.js");

const rankPlayers = {
    postGameAdjust: function(game){
        let result = 'success';
        //set beta to sigma (high luck element)
        trueskill.SetParameters(25.0/3);
        //get players from database
        UserModel.find({username: {$in: game.usernames}}, function(err, players){
            if(err){
                console.error("Failed to find and update user data");
                console.error(err);
                result = 'failedToFind';
                return;
            }
            if(players.length < 2){
                result = 'notEnoughRegisteredPlayers';
                return; 
            }
            try{
                for(let i=0; i<players.length; i++){
                    players[i].skill = players[i][`p${game.num_players}_skill`];
                    players[i].rank = game.usernames_ranked.indexOf(players[i].username);
                    players[i][`p${game.num_players}_record`][players[i].rank]++;
                    if(game.players_timed_out.includes(players[i].username)){
                        players[i][`p${game.num_players}games_stalled`]++;
                    }
                }
            }
            catch(error){
                console.error(error);
            }
            // Do the computation to find each player's new skill estimate.
            
            try{
                trueskill.AdjustPlayers(players);
            }
            catch(err){
                console.error("Couldn't adjust players' skills");
                console.error(err);
            }
            // Update db
            players.forEach((player) => {
                UserModel.updateOne({username: player.username}, {
                    $set: {
                        [`p${game.num_players}_skill`]: player.skill, 
                        [`p${game.num_players}_record`]: player[`p${game.num_players}_record`],
                        [`p${game.num_players}games_stalled`]: player[`p${game.num_players}games_stalled`]
                    }
                }, function(updateErr, updateDocs){
                    if(updateErr){
                        console.error(updateErr);
                    }
                });
            });
        })
    },
};

module.exports = rankPlayers;