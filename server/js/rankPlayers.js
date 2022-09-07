"use strict";
const UserModel = require("../models/User.js");

const trueskill = require("trueskill");
const rankPlayers = {
    postGameAdjust: function(game){
        let result = 'success';
        //set beta to sigma (high luck element)
        trueskill.SetParameters(25.0/3);
        //get players from database
        UserModel.find({username: {$in: game.usernames}}, function(err, players){
            if(err){
                console.log(err);
                result = 'failedToFind';
                return;
            }
            console.log(players);
            if(players.length < 2){
                result = 'notEnoughRegisteredPlayers';
                return; 
            }
            for(let i=0; i<players.length; i++){
                players[i].skill = players[i][`p${game.num_players}_skill`];
                players[i].rank = game.usernames_ranked.indexOf(players[i].username);
                players[i][`p${game.num_players}_record`][players[i].rank]++;
                if(game.players_timed_out.includes(players[i].username)){
                    players[i][`p${game.num_players}games_stalled`]++;
                }
            };
            // Do the computation to find each player's new skill estimate.
            
            trueskill.AdjustPlayers(players);
            // Update db
            players.forEach((player) => {
                console.log("later skill: ")
                console.log(player.skill);
                UserModel.updateOne({username: player.username}, {
                    $set: {
                        [`p${game.num_players}_skill`]: player.skill, 
                        [`p${game.num_players}_record`]: player[`p${game.num_players}_record`],
                        [`p${game.num_players}games_stalled`]: player[`p${game.num_players}games_stalled`]
                    }
                }, function(updateErr, updateDocs){
                    if(updateErr){
                        console.log(updateErr);
                    }
                    else{
                        console.log(updateDocs);
                    }
                });


            });
        })
        //trueskill.AdjustPlayers([alice, bob, darren]);
    },
    tester: async function(){
        let players = await UserModel.find({username: {$in: ['tate', 'test0']}});
        console.log(players);
            if(players.length < 2){
                result = 'notEnoughRegisteredPlayers';
                return; 
            }
        players.forEach((player) => {
            console.log(player);
            player.gamer = "afasdfa";
            UserModel.updateOne({username: player.username}, {
                $set: {email: `test${player.username}`}
            }, function(updateErr, updateDocs){
                if(updateErr){
                    console.log(updateErr);
                    console.log("here")
                }
                else{
                    console.log(updateDocs);
                }
            });


        });
        /*
        let alice = {}
        alice.skill = [25.0, 25.0/3.0]
        
        let bob = {}
        bob.skill = [25.0, 25.0/3.0]
        
        let chris = {}
        chris.skill = [25.0, 25.0/3.0]
        
        let darren = {}
        darren.skill = [25.0, 25.0/3.0]
        
        // The four players play a game.  Alice wins, Bob and Chris tie for
        // second, Darren comes in last.  The actual numerical values of the
        // ranks don't matter, they could be (1, 2, 2, 4) or (1, 2, 2, 3) or
        // (23, 45, 45, 67).  All that matters is that a smaller rank beats a
        // larger one, and equal ranks indicate draws.
        
        alice.rank = 1
        bob.rank = 2
        chris.rank = 2
        darren.rank = 4

        alice.rank = 3;
       
        
        // Do the computation to find each player's new skill estimate.
        trueskill.SetParameters(25.0/3);
        trueskill.AdjustPlayers([alice, bob, darren]);
        alice.rank = 1;
        for(let i=0; i<5; ++i){

            trueskill.AdjustPlayers([alice, bob, darren]);
            
            // Print the results.
            
            
        }
        
        console.log("alice:");
        console.log(alice.skill);
        console.log("bob:");
        console.log(bob.skill);
        console.log("chris:");
        console.log(chris.skill);
        console.log("darren:");
        console.log(darren.skill);
        */
    }
};

module.exports = rankPlayers;