"use strict";

const sharedGameFunctions = require("./sharedGameFunctions.js");

const computerPlayer = {
    makeNextMove: function(game){
        /**
        * Calculates *reasonable* next move in the game, for the player <game.state.turn>.
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
    },

    getAbstractGameFeatures: function(game){
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
            abstractGameFeatures.tileFeatures.push(tileFeatures);          
        });
        ['i', 'c', 'w', 'f', 'a', 't', 'l'].forEach((chain) => {
            let positions = [];
            game.state.player_states.forEach((player) => {
                positions.push(player[chain]);
            });
            abstractGameFeatures[chain].positions = positions;
        });
    },
    
    computerPlayTile: function(game, abstractGameFeatures){
        //maybe make copy of game and examine effect of playing each tile...

        let selectedTile;
        game.state.player_states[game.state.turn].tiles.forEach((tile) => {
            if(!(tile.predicted_type === 'd' || tile.predicted_type === 'z')){
                selectedTile = tile;
            }
        })

        let move = {x: selectedTile.x, y: selectedTile.y}
        return move;
    },

    computerPurchaseShares: function(game){
        let move = {purchase: {}};
        return move;

    },

    computerChooseNewChain: function(game){
        let move = {newChainChoice: game.state.available_chains[0]};
        return move;
    },

    computerChooseRemainingChain: function(game){
        let move = {remainingChainChoice: game.state.active_merger.largest_chains[0]};
        return move;
    },

    computerChooseNextElimChain: function(game){
        let move = {nextElimChain: game.state.active_merger.elim_chains_ranked[0][0]};
        return move;
    },

    computerDisposeShares: function(game){
        let disposingChain = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
        let move = {sell: game.state.player_states[game.state.turn][disposingChain], trade: 0, keep: 0};
        return move;

    },

}

module.exports = computerPlayer;