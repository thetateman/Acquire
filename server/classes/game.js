class game {
    //eventually games should have a UUID for storage and stats calculation
    //this just creates human readable IDs for active games
    static genNewGameID(games){ 
        let gameIDs = Object.keys(games)
        let id;
        for(let i = 1; i < 10000; i++){
            if(!gameIDs.includes(i.toString())){
                id = i;
                break;
            }
        }
        return id;
    };
    static createGame(games, numPlayers, creator = ""){
        let users = new Array(numPlayers).fill("");
        users[0] = creator;
        let id = this.genNewGameID(games)
        let newGame = {
            id: id,
            user_ids: users,
            state: {
                inPlay: true,
                turn: 0,
                board: [
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'l', 'l', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 's', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',]
                ],
                bank_shares: {
                    imperial: 25,
                    continental: 25,
                    american: 25, 
                    worldwide: 25,
                    festival: 25, 
                    luxor: 25,
                    tower: 25
                },
                player_states: [
                    {
                    tiles: [],
                    imperial: 25,
                    continental: 25,
                    american: 25, 
                    worldwide: 25,
                    festival: 25, 
                    luxor: 25,
                    tower: 25
                    }
                ]
            }

        };
        games[id] = newGame;
        return id;
    };

    static updateGame(game, userID, updateType, updateData){
        /**
        * Called after receiving game updating websocket message, updates in-memory game object.
        * @param {object} game - the game to be updated.
        * @param {int} userID - the id of the user who initiated the action.
        * @param {string} updateType - updateType should be in: ['playTile', 'purchaseShares', 'chooseRemainingChain', 'disposeShares', 'endGame'].
        * @param {object} updateData - action details, e.g., coordinates of tile played.
        * @returns {string} 'Success' or error string
        */

        switch(updateType){
            case 'playTile':
                console.log("here");
                game.state.turn = updateData.x;
                break;
            case 'purchaseShares':

                break;
            case 'chooseChain':

                break;
            case 'disposeShares':

                break;
            case 'endGame':

                break;
            default:
                console.log("Not a valid updateType.")
                return "invalidUpdateType";
        }
    };
}

module.exports = game;

