const internalGameFunctions = require("./classes/game.js");

class computerPlayer{
    static makeNextMove(game){
        /**
        * Calculates *reasonable* next move in the game, for the player <game.state.turn>.
        * @param {object} game - the game to be updated.
        * @returns {object} object representing a game action, may be passed to updateGame().
        */
       const abstractGameFeatures = getAbstractGameFeatures(game);
       switch(game.state.expectedNextAction){
        case 'playTile':
            return this.computerPlayTile(game, abstractGameFeatures);
        case 'purchaseShares':
            return this.computerPurchaseShares(game);
        case 'chooseNewChain':
            return this.computerChooseNewChain(game);
        case 'chooseRemainingChain':
            return this.computerChooseRemainingChain(game);
        case 'chooseNextElimChain':
            return this.computerChooseNextElimChain(game)
        case 'disposeShares':
            return this.computerDisposeShares(game);
        default:
            return 'unexpectedActionType';
       }
    };

    static getAbstractGameFeatures(game){
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
            tileFeatures.neighbors = internalGameFunctions.getNeighbors(game, tile.x, tile.y);  
            abstractGameFeatures.tileFeatures.push(tileFeatures);          
        });
        ['i', 'c', 'w', 'f', 'a', 't', 'l'].forEach((chain) => {
            let positions = [];
            game.state.player_states.forEach((player) => {
                positions.push(player[chain]);
            });
            abstractGameFeatures[chain].positions = positions;
        });
    }
    
    static computerPlayTile(game, abstractGameFeatures){
        //maybe make copy of game and examine effect of playing each tile...



        let selectedTile = game.state.player_states[game.state.turn].tiles[0];
        return {selectedTile.x, selectedTile.y}
    };

    static computerPurchaseShares(game){

    };

    static computerChooseNewChain(game){

    };

    static computerChooseRemainingChain(game){

    };

    static computerChooseNextElimChain(game){

    };

    static computerDisposeShares(game){

    };

}

module.exports = computerPlayer;