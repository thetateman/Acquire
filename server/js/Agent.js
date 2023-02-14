"use strict";

const sharedGameFunctions = require("./sharedGameFunctions.js");

class Agent {





    makeNextMove(game){
        /**
        * Calculates next move in the game, for the player <game.state.turn>.
        * @param {object} game - the game to be updated.
        * @returns {object} object representing a game action, may be passed to updateGame().
        */
        const abstractGameFeatures = this.getAbstractGameFeatures(game);
        switch(game.state.expectedNextAction){
         case 'playTile':
             return this.computerPlayTile(game, abstractGameFeatures);
         case 'purchaseShares':
             return this.computerPurchaseShares(game, abstractGameFeatures);
         case 'chooseNewChain':
             return this.computerChooseNewChain(game, abstractGameFeatures);
         case 'chooseRemainingChain':
             return this.computerChooseRemainingChain(game, abstractGameFeatures);
         case 'chooseNextElimChain':
             return this.computerChooseNextElimChain(game, abstractGameFeatures)
         case 'disposeShares':
             return this.computerDisposeShares(game, abstractGameFeatures);
         default:
             return 'unexpectedActionType';
        }
       
    }

    getAbstractGameFeatures(game){
        let abstractGameFeatures = {
            tileFeatures: [],
            i: {
                iCanMergeIn: -1,
                tilesToMerge: -1,
                myPosition: '', // ['absoluteLead', 'defendableLead', 'absoluteSecond', 'defendableSecond', ]

            },
            c: {

            },
            a: {

            }, 
            w: {

            },
            f: {

            }, 
            l: {

            },
            t: {

            }
        };
        game.state.player_states[game.state.turn].tiles.forEach((tile) => {
            let tileFeatures = JSON.parse(JSON.stringify(tile));
            tileFeatures.neighbors = sharedGameFunctions.getNeighbors(game.state.board, tile.x, tile.y);
            tileFeatures.connectingTrueChains = tileFeatures.neighbors.filter((f) => ['i', 'c', 'w', 'f', 'a', 't', 'l'].includes(f));
            tileFeatures.predicted_type = sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, tile.x, tile.y);  
            abstractGameFeatures.tileFeatures.push(tileFeatures);          
        });
        ['i', 'c', 'w', 'f', 'a', 't', 'l'].forEach((chain) => {
            let positions = [];
            game.state.player_states.forEach((player) => {
                positions.push(player[chain]);
            });
            abstractGameFeatures[chain].positions = positions;
        });
        return abstractGameFeatures;
    }

    getRankInfo(game, chains){

    }
    
    computerPlayTile(game, abstractGameFeatures){
        console.log("im the parent.");
        
    }

    computerPurchaseShares(game, abstractGameFeatures){
        

    }

    computerChooseNewChain(game){
        
    }

    computerChooseRemainingChain(game, abstractGameFeatures){
        
    }

    computerChooseNextElimChain(game){
        
    }

    computerDisposeShares (game){

    }
}

module.exports = Agent;