const internalGameFunctions = require("./classes/game.js");

class computerPlayer{
    static makeNextMove(game){
        /**
        * Calculates *reasonable* next move in the game.
        * @param {object} game - the game to be updated.
        * @returns {object} object representing a game action, may be passed to updateGame().
        */
       switch(game.state.expectedNextAction){
        case 'playTile':
            return this.computerPlayTile(game);
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
    
    static computerPlayTile(game){

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