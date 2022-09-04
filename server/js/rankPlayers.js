"use strict";

const trueskill = require("trueskill");
const rankPlayers = {
    tester: function(){
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
    }
};

module.exports = rankPlayers;