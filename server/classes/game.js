class game {

    //------------------Game Creation Helper Functions------------------------
    
    static genNewGameID(games){ 
        //eventually games should have a UUID for storage and stats calculation
        //this just creates human readable IDs for active games
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

    //------------------Game Update Helper Functions------------------------
    
    static tilePlacer(board, chains, x, y){
        //updates board with new tile, returns string in ["normal", "newChain", "merger"]
        let connectingChains = [];
        let placementType = 'normal';
        let tileChain = 's';

        //check neighbors
        if(board[y+1] != null){
            if(board[y+1][x] != 'e' && board[y+1][x] != null){
                connectingChains.push(board[y+1][x]);
            }
        }
        if(board[y-1] != null){
            if(board[y-1][x] != 'e' && board[y-1][x] != null){
                connectingChains.push(board[y-1][x]);
            }
        }
        if(board[y][x+1] != 'e' && board[y][x+1] != null){
            connectingChains.push(board[y][x+1]);
        }
        if(board[y][x-1] != 'e' && board[y][x-1] != null){
            connectingChains.push(board[y][x-1]);
        }
        if(connectingChains.length > 0){
            if(connectingChains.every((element) => element == 's')){
                placementType = 'newChain';
                tileChain = 'p' //pending, should change with next action
            }
            else {
                if(connectingChains.length == 1){
                    tileChain = connectingChains[0];
                    chains[connectingChains].push({'x': x, 'y': y});

                }
                else {
                    placementType = 'merger';
                    tileChain = 'p'; //pending, should change with next action
                }
            }
        }
        board[y][x] = tileChain; //maybe change for non-normal cases
        console.log(connectingChains);
        console.log(placementType);
        return placementType;

        
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
                expectedNextAction: 'playTile',
                lastPlayedTile: {},
                board: [
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 's', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'l', 'l', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',]
                ],
                chains: {
                    i: [],
                    c: [],
                    a: [], 
                    w: [],
                    f: [], 
                    l: [],
                    t: []
                },
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
                    cash: 6000,
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
        * @param {string} updateType - updateType should be in: ['playTile', 'chooseNewChain', 'chooseRemainingChain', 'disposeShares', 'purchaseShares'].
        * @param {object} updateData - action details, e.g., coordinates of tile played.
        * @returns {string} 'Success' or error string
        */
        //const actions = ['playTile', 'chooseNewChain', 'chooseRemainingChain', 'disposeShares', 'purchaseShares']
        /*
        if (updateType !== game.state.expectedNextAction){
            return 'unexpectedActionType';
        }
        */
        switch(updateType){
            case 'playTile':
                //check that action is legal
                if((! (0 <= updateData.x && updateData.x <= 11)) || (! (0 <= updateData.y && updateData.y <= 8))){
                    return "tileOutsideBoard";
                } 
                if(game.state.board[updateData.y][updateData.x] !== 'e'){
                    return "tileAlreadyPlayed";
                }
                //TODO: check for dead/asleep tiles
                //update the game
                switch(this.tilePlacer(game.state.board, game.state.chains, updateData.x, updateData.y)){
                    case 'normal':
                        game.state.expectedNextAction = 'purchaseShares'; //should we wait for a pass if player has no cash?
                        console.log("ok, now we're waiting to purchase shares...")
                        break;
                    case 'newChain':
                        //TODO
                        game.state.expectedNextAction = 'chooseNewChain';
                        game.state.lastPlayedTile = updateData;
                        console.log("waiting to choose chain...")
                        break;
                    case 'merger':
                        //TODO
                        game.state.expectedNextAction = 'disposeShares';
                        break;
                    default:
                        console.log("Not a valid placement type.")
                }


                break;
            case 'chooseNewChain':
                //TODO

                game.state.expectedNextAction = 'purchaseShares'
                break;
            case 'chooseRemainingChain':
                //TODO: decide where to store chain choice. 
                // - maybe game needs an 'active merger' object to store info like this.

                game.state.expectedNextAction = 'disposeShares'

                break;
            case 'disposeShares':

                game.state.expectedNextAction = 'purchaseShares'
                break;
            case 'purchaseShares':



                if(updateData.endGame === true){
                    game.state.inPlay = false;
                }
                else {
                    game.state.expectedNextAction = 'playTile';
                    game.state.turn++;
                }
                break;
            default:
                console.log("Not a valid updateType.")
                return "invalidUpdateType";
        }
        return "success";
    };
}

module.exports = game;

