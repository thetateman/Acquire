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
    
    static tilePlacer(board, chains, active_merger, x, y){
        //updates board with new tile, returns string in ["normal", "newChain", "merger"]
        let placementType = 'normal';
        let tileChain = 's';
        let connectingChains = this.getNeighbors(board, x, y); // List of unique chains adjacent to new tile

        if(connectingChains.length > 0){
            if(connectingChains.every((element) => element === 's')){
                placementType = 'newChain';
                tileChain = 'p' //pending, should change with next action
            }
            else {
                let connectingTrueChains = connectingChains.filter((f) => f !== 's')
                if(connectingTrueChains.length === 1){
                    tileChain = connectingTrueChains[0];
                    console.log(connectingTrueChains);
                    chains[tileChain].push({'x': x, 'y': y});
                    let connectedSingleTiles = this.getConnectingSingles(board, x, y)
                    chains[tileChain] = chains[tileChain].concat(connectedSingleTiles);
                    connectedSingleTiles.forEach((tile) => {board[tile.y][tile.x] = tileChain;});
                    

                }
                else {
                    let mergingChains = [];
                    let largestChains = [connectingTrueChains[0]];
                    for(let i = 1; i < connectingTrueChains.length; i++){
                        if(connectingTrueChains[i].length > largestChains[0].length){
                            largestChains.length = 0;
                            largestChains.push(connectingTrueChains[i]);
                        }
                        else if(chains[connectingTrueChains[i]].length === chains[largestChains[0]].length){
                            largestChains.push(connectingTrueChains[i]);
                        }
                    }
                    console.log("testing......");
                    console.log(largestChains);
                    let remainingChain = 'p'; //pending, should change with next action
                    if(largestChains.length === 1){
                        remainingChain = largestChains[0];
                    }
                    //connectingTrueChains.forEach((chain) => mergingChains.push(chains[chain]));
                    active_merger.merging_chains = connectingTrueChains;
                    active_merger.largest_chains = largestChains;
                    active_merger.remaining_chain = remainingChain;
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
    static getNeighbors(board, x, y){
        /**
        * Checks each tile adjacent to input and adds unique tile types to input
        * @returns {array} List of unique tile types adjacent to input tile (excludes 'e')
        */
        let connectingChains = [];
        if(board[y+1] != null){ //Check that row is in range
            if(board[y+1][x] != 'e' && board[y+1][x] != null){ // If tile is not empty and not outside the board
                if(!connectingChains.includes(board[y+1][x])){ // Check that we did not already add chain
                    connectingChains.push(board[y+1][x]); //Add chain to connectingChains
                }
            }
        }
        if(board[y-1] != null){
            if(board[y-1][x] != 'e' && board[y-1][x] != null){
                if(!connectingChains.includes(board[y-1][x])){
                    connectingChains.push(board[y-1][x]);
                }
            }
        }
        if(board[y][x+1] != 'e' && board[y][x+1] != null){
            if(!connectingChains.includes(board[y][x+1])){
                connectingChains.push(board[y][x+1]);
            }
        }
        if(board[y][x-1] != 'e' && board[y][x-1] != null){
            if(!connectingChains.includes(board[y][x-1])){
                connectingChains.push(board[y][x-1]);
            }
        }
        return connectingChains;
    };
    static getConnectingSingles(board, x, y){
        /**
        * Performs a depth-first search for every connected single tile
        * @returns {array} List of single tiles connected to input
        */
        let searching = true;
        let currentTile;
        let currentTileIndex;
        let newTile;
        let connectingSingles = [];
        let searchEdgeStack = [{x, y}];
        while(searchEdgeStack.length !== 0){
            currentTileIndex = searchEdgeStack.length - 1;
            currentTile = searchEdgeStack[currentTileIndex];
            newTile = {'x': currentTile.x, 'y': currentTile.y+1};
            if(board[newTile.y] != null){
                if(board[newTile.y][newTile.x] === 's'){
                    if(!connectingSingles.find((tile) => tile.x === newTile.x && tile.y === newTile.y)){
                        connectingSingles.push(JSON.parse(JSON.stringify(newTile)));
                        searchEdgeStack.push(JSON.parse(JSON.stringify(newTile)));
                    }
                }
            }
            newTile = {'x': currentTile.x, 'y': currentTile.y-1};
            if(board[newTile.y] != null){
                if(board[newTile.y][newTile.x] === 's'){
                    if(!connectingSingles.find((tile) => tile.x === newTile.x && tile.y === newTile.y)){
                        connectingSingles.push(JSON.parse(JSON.stringify(newTile)));
                        searchEdgeStack.push(JSON.parse(JSON.stringify(newTile)));
                    }
                }
            }
            newTile = {'x': currentTile.x+1, 'y': currentTile.y};
            if(board[newTile.y][newTile.x] === 's'){
                if(!connectingSingles.find((tile) => tile.x === newTile.x && tile.y === newTile.y)){
                    connectingSingles.push(JSON.parse(JSON.stringify(newTile)));
                    searchEdgeStack.push(JSON.parse(JSON.stringify(newTile)));
                }
            }
            newTile = {'x': currentTile.x-1, 'y': currentTile.y};
            if(board[newTile.y][newTile.x] === 's'){
                if(!connectingSingles.find((tile) => tile.x === newTile.x && tile.y === newTile.y)){
                    connectingSingles.push(JSON.parse(JSON.stringify(newTile)));
                    searchEdgeStack.push(JSON.parse(JSON.stringify(newTile)));
                }
            }
            searchEdgeStack.splice(currentTileIndex, 1);
            
        }
        return connectingSingles;
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
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
                ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',]
                ],
                single_tiles: [],
                available_chains: ['i', 'c', 'a', 'w', 'f', 'l', 't'],
                active_merger: {},
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
                switch(this.tilePlacer(game.state.board, game.state.chains, game.state.active_merger, updateData.x, updateData.y)){
                    case 'normal':
                        game.state.expectedNextAction = 'purchaseShares'; //should we wait for a pass if player has no cash?
                        console.log("ok, now we're waiting to purchase shares...")
                        break;
                    case 'newChain':
                        game.state.expectedNextAction = 'chooseNewChain';
                        game.state.lastPlayedTile = updateData;
                        console.log("waiting to choose chain...")
                        break;
                    case 'merger':
                        if(game.state.active_merger.remaining_chain === 'p'){ // If waiting on chain choice
                            game.state.expectedNextAction = 'chooseRemainingChain';
                        }
                        else{
                            game.state.expectedNextAction = 'disposeShares'
                        }
                        game.state.lastPlayedTile = updateData;
                        console.log(game.state.active_merger)
                        break;
                    default:
                        console.log("Not a valid placement type.")
                }


                break;
            case 'chooseNewChain':
                // Check that chain is available
                if(!game.state.available_chains.includes(updateData.newChainChoice)){
                    return 'chainUnavailable';
                }
                // Remove choice from list of available chains
                game.state.available_chains = game.state.available_chains.filter((f) => f !== updateData.newChainChoice);

                // Create list of played tile and connecting single tiles, add the
                // list to the selected chain, and update the board.
                let newTile = game.state.lastPlayedTile;
                let connectedSingleTiles = this.getConnectingSingles(game.state.board, newTile.x, newTile.y); 
                connectedSingleTiles.push({'x': newTile.x, 'y': newTile.y});
                game.state.chains[updateData.newChainChoice] = connectedSingleTiles;
                connectedSingleTiles.forEach((tile) => {game.state.board[tile.y][tile.x] = updateData.newChainChoice;});
                game.state.expectedNextAction = 'purchaseShares';
                break;
            case 'chooseRemainingChain':
                if(game.state.active_merger.remaining_chain === 'p'){
                    if(game.state.active_merger.largest_chains.includes(updateData.remainingChainChoice)){
                        game.state.active_merger.remaining_chain = updateData.remainingChainChoice;
                    }
                    else {
                        return "notLargestChainInMerger";
                    }
                }
                game.state.expectedNextAction = 'disposeShares'

                break;
            case 'disposeShares':
                let shareDisposalComplete = false;

                shareDisposalComplete = true;
                if(shareDisposalComplete){
                    let mergingTile = game.state.lastPlayedTile;
                    let mergingChainTiles = [mergingTile];
                    console.log(game.state.active_merger);
                    game.state.active_merger.merging_chains.forEach((chain) => {
                        mergingChainTiles = mergingChainTiles.concat(JSON.parse(JSON.stringify(game.state.chains[chain])));
                        game.state.chains[chain] = [];
                    });
                    mergingChainTiles = mergingChainTiles.concat(
                        this.getConnectingSingles(game.state.board, mergingTile.x, mergingTile.y));
                    game.state.chains[game.state.active_merger.remaining_chain] = mergingChainTiles;
                    //mergingChainTiles.forEach((tile) => {game.state.board[tile.y][tile.x] = game.state.active_merger.remaining_chain;});
                    for(let i = 0; i < mergingChainTiles.length; i++){
                        let currentTile = mergingChainTiles[i];
                        game.state.board[currentTile.y][currentTile.x] = game.state.active_merger.remaining_chain;
                    }
                    console.log("merging tiles")
                    console.log(mergingChainTiles);
                    
                }
                

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

