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

    static shuffleArray(arr) { // Fisher-Yates random shuffle.
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    };

    static genTileBank(){
        let tileBank = [];
        for(let i = 0; i < 12; i++){
            for(let j = 0; j < 9; j++){
                tileBank.push({x: i, y: j});
            }
        }
        this.shuffleArray(tileBank);
        return tileBank;
    }

    //------------------Game Update Helper Functions------------------------
    
    static tilePlacer(board, chains, share_prices, active_merger, x, y){
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
                let connectingTrueChains = connectingChains.filter((f) => f !== 's');
                if(connectingTrueChains.length === 1){
                    tileChain = connectingTrueChains[0];
                    console.log(connectingTrueChains);
                    chains[tileChain].push({'x': x, 'y': y});
                    let connectedSingleTiles = this.getConnectingSingles(board, x, y);
                    chains[tileChain] = chains[tileChain].concat(connectedSingleTiles);
                    connectedSingleTiles.forEach((tile) => {board[tile.y][tile.x] = tileChain;});
                    this.updatePrice(tileChain, chains, share_prices);
                    

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
            console.log(`currentTile: ${JSON.stringify(currentTile)}`);
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

    static predictTileType(board, chains, available_chains, x, y){
        /**
        * Uses getNeighbors function and chain info to calculate the potential type of a tile.
        * predictedType should be in ['<chain>', 's'(single), 'm'(merger), 'n'(new chain), 'z'(asleep), 'd'(dead)].
        * @returns {string} Character representing the type a tile would be if played
        * 
        */
       let predictedType = 's';
       let neighbors = this.getNeighbors(board, x, y);
       let connectingTrueChains = neighbors.filter((f) => f !== 's');
       if(connectingTrueChains.length > 0){
           if(connectingTrueChains.length === 1){
               predictedType = connectingTrueChains[0];
               return predictedType;
           } 
           else {
               let numSafeChains = 0;
               for(let i = 0; i < connectingTrueChains.length; i++){
                   if(chains[connectingTrueChains[i]].length >= 11){
                       numSafeChains++;
                   }
               }
               if(numSafeChains >= 2){
                   predictedType = 'd';
                   return predictedType;
               }
               else {
                   predictedType = 'm';
                   return predictedType;
               }
           }
       }
       else if(neighbors.length > 0){
            if(available_chains.length === 0){
                predictedType = 'z';
                return predictedType;
            }
            else {
                predictedType = 'n';
                return predictedType;
            }
       }
       return predictedType;
    };

    // Update the price of a chain
    static updatePrice(chain, chains, share_prices){
        let basePrice = 0;
        let finalPrice = 0;
        switch(chain){
            case 'i':
            case 'c':
                basePrice = 200;
                break;
            case 'a':
            case 'w':
            case 'f':
                basePrice = 100;
                break;
            case 't':
            case 'l':
                basePrice = 0;
                break;
            default:
                return "notValidChain";
                break;
        }
        if(chains[chain].length <= 6){
            finalPrice = basePrice + 100 * chains[chain].length;
        }
        else if(chains[chain].length <= 10){
            finalPrice = basePrice + 600;
        }
        else if(chains[chain].length <= 20){
            finalPrice = basePrice + 700;
        }
        else if(chains[chain].length <= 30){
            finalPrice = basePrice + 800;
        }
        else if(chains[chain].length <= 40){
            finalPrice = basePrice + 900;
        }
        else{
            finalPrice = basePrice + 1000;
        }
        share_prices[chain] = finalPrice;
    };

    static awardPrizes(game, reason='merger'){
        let elimChains = [];
        if(reason === 'merger'){
            elimChains = elimChains.concat(game.state.active_merger.merging_chains.filter((chain) => chain !== game.state.active_merger.remaining_chain));
        }
        else if(reason === "endGame"){
            elimChains = elimChains.concat(['i', 'c', 'a', 'w', 'f', 'l', 't'].filter((chain) => !game.state.available_chains.includes(chain)));
        }
        console.log(elimChains);
        for(let i = 0; i < elimChains.length; i++){
            let firstPlaces = [];
            let secondPlaces = [];
            let firstShareNum = 0.5;
            let secondShareNum = 0.5;
            for(let j = 0; j < game.num_players; j++){
                if(game.state.player_states[j][elimChains[i]] > firstShareNum){
                    firstPlaces.length = 0;
                    firstPlaces.push(j);
                    firstShareNum = game.state.player_states[j][elimChains[i]];
                } 
                else if(game.state.player_states[j][elimChains[i]] == firstShareNum){
                    firstPlaces.push(j);
                }
            }
            if(firstPlaces.length > 1){ //first place tie
                // all players who tie for first place split first and second place awards.
                let combinedReward = 15 * game.state.share_prices[elimChains[i]]; 
                let splitReward = combinedReward / firstPlaces.length;
                splitReward += (100 - (splitReward % 100)) //Rounding up to 100th place.
                for(let k = 0; k < firstPlaces.length; k++){
                    game.state.player_states[firstPlaces[k]].cash += splitReward;
                    console.log(`Player ${firstPlaces[k]} tied for first and receives ${splitReward} for ${elimChains[i]}`);
                }
            }
            else{ // no tie for first
                for(let j = 0; j < game.num_players; j++){
                    if(j === firstPlaces[0]){
                        continue;
                    }
                    if(game.state.player_states[j][elimChains[i]] > secondShareNum){
                        secondPlaces.length = 0;
                        secondPlaces.push(j);
                        secondShareNum = game.state.player_states[j][elimChains[i]];
                    }
                    else if(game.state.player_states[j][elimChains[i]] == secondShareNum){
                        secondPlaces.push(j);
                    }
                }
                if(secondPlaces.length > 1){ //tie for second
                    let splitReward = 5 * game.state.share_prices[elimChains[i]] / secondPlaces.length;
                    splitReward += (100 - (splitReward % 100)) //Rounding up to 100th place.
                    for(let k = 0; k < secondPlaces.length; k++){
                        game.state.player_states[secondPlaces[k]].cash += splitReward;
                        console.log(`Player ${firstPlaces[k]} tied for second and receives ${splitReward} for ${elimChains[i]}`);
                    }
                }
                if(firstPlaces.length === 0){
                    console.log(`No ${elimChains[i]} shares, skipping prizes. (should only happen in debug).`);
                    continue;
                }
                if(secondPlaces.length === 0){
                    secondPlaces.push(firstPlaces[0]);
                    console.log(`No one had second in ${elimChains[i]}, giving second place prize to ${firstPlaces[0]}`);
                }
                console.log(`No ties: awarding ${10 * game.state.share_prices[elimChains[i]]} to ` + 
                    `player ${firstPlaces[0]} and ${5 * game.state.share_prices[elimChains[i]]} to player ` +
                    `${secondPlaces[0]} for ${elimChains[i]}.`);
                game.state.player_states[firstPlaces[0]].cash += 10 * game.state.share_prices[elimChains[i]];
                game.state.player_states[secondPlaces[0]].cash += 5 * game.state.share_prices[elimChains[i]];
            }
        }
    };
    
    static createGame(games, maxPlayers, creator){
        let id = this.genNewGameID(games)
        let newGame = {
            id: id,
            num_players: 0,
            max_players: maxPlayers,
            user_uuids: [],
            state: {
                game_started: false,
                game_ended: false,
                turn: 0,
                play_count: 0,
                expectedNextAction: 'playTile',
                lastPlayedTile: {},
                tile_bank: this.genTileBank(),
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
                    i: 25,
                    c: 25,
                    a: 25, 
                    w: 25,
                    f: 25, 
                    l: 25,
                    t: 25
                },
                share_prices: {
                    i: 0,
                    c: 0,
                    a: 0, 
                    w: 0,
                    f: 0, 
                    l: 0,
                    t: 0
                },
                player_states: []
            }
        };
        this.updateGame(newGame, creator, 'joinGame', {});
        games[id] = newGame;
        return id;
    };

    static updateGame(game, userUUID, updateType, updateData, admin=false){
        /**
        * Called after receiving game updating websocket message, updates in-memory game object.
        * @param {object} game - the game to be updated.
        * @param {string} userUUID - the id of the user who initiated the action.
        * @param {string} updateType - updateType should be in: ['joinGame', 'startGame', 'playTile', 'chooseNewChain', 'chooseRemainingChain', 'disposeShares', 'purchaseShares'].
        * @param {object} updateData - action details, e.g., coordinates of tile played.
        * @param {boolean} admin - updater is using administrator privilages to override game rules.
        * @returns {string} 'Success' or error string
        */

        // Handle metagame update types
        if(updateType === 'joinGame'){
            if(game.state.game_started){
                return "gameAlreadyStarted";
            }
            if(game.user_uuids.includes(userUUID)){
                return "userAlreadyInGame";
            }
            if(game.max_players === game.user_uuids.length){
                return "gameFull";
            }
            else{
                game.num_players++;
                game.user_uuids.push(userUUID);
                game.state.player_states.push({
                    tiles: [],
                    cash: 6000,
                    i: 0,
                    c: 0,
                    a: 0, 
                    w: 0,
                    f: 0, 
                    l: 0,
                    t: 0
                    });
                return "success";
            }
        }
        else if(updateType === 'startGame'){
            if(userUUID !== game.users[0]){
                return "onlyCreatorMayStartGame";
            }
            else{
                game.state.game_started = true;
                return "success";
            }
        }

        //userUUID is passed in as a string, here we convert it to the
        //player number that represents that user in this game.
        let userID = game.user_uuids.indexOf(userUUID);
        console.log(userID);
        if(userID === -1){
            return "userNotInGame";
        }
        
        console.log(`Player ${game.state.turn}'s turn to ${game.state.expectedNextAction}.`);
        if(userID !== game.state.turn && !admin){
            return 'notPlayersTurn';
        }
        if (updateType !== game.state.expectedNextAction && !admin){
            return 'unexpectedActionType';
        }
        
        switch(updateType){
            case 'playTile':
                //check that action is legal
                if((! (0 <= updateData.x && updateData.x <= 11)) || (! (0 <= updateData.y && updateData.y <= 8))){
                    return "tileOutsideBoard";
                } 
                if(game.state.board[updateData.y][updateData.x] !== 'e'){
                    return "tileAlreadyPlayed";
                }
                if(!admin && null == game.state.player_states[userID].tiles.find((tile) => updateData.x === tile.x && updateData.y === tile.y)){
                    return "userLacksTile";
                }
                if(['z', 'd'].includes(this.predictTileType(game.state.board, game.state.chains, game.state.available_chains, updateData.x, updateData.y))){
                    return "tileDeadOrAsleep";
                }
                // Remove tile from player hand
                game.state.player_states[userID].tiles = game.state.player_states[userID].tiles.filter((tile) => !(updateData.x === tile.x && updateData.y === tile.y));
                //update the game
                switch(this.tilePlacer(game.state.board, game.state.chains, game.state.share_prices, game.state.active_merger, updateData.x, updateData.y)){
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
                this.updatePrice(updateData.newChainChoice, game.state.chains, game.state.share_prices);
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
                        game.state.available_chains.push(chain);
                    });
                    mergingChainTiles = mergingChainTiles.concat(
                        this.getConnectingSingles(game.state.board, mergingTile.x, mergingTile.y));
                    game.state.chains[game.state.active_merger.remaining_chain] = mergingChainTiles;
                    //mergingChainTiles.forEach((tile) => {game.state.board[tile.y][tile.x] = game.state.active_merger.remaining_chain;});
                    for(let i = 0; i < mergingChainTiles.length; i++){
                        let currentTile = mergingChainTiles[i];
                        game.state.board[currentTile.y][currentTile.x] = game.state.active_merger.remaining_chain;
                    }
                    game.state.active_merger.merging_chains.forEach((chain) => {
                        this.updatePrice(chain, game.state.chains, game.state.share_prices)
                    });
                    
                    //merger operations complete, clear active_merger object
                    game.state.active_merger = {};

                    console.log("merging tiles")
                    console.log(mergingChainTiles);
                    
                }
                

                game.state.expectedNextAction = 'purchaseShares'
                break;
            case 'purchaseShares':
                //validity checks:
                // 1. <=3 shares
                // 2. shares are available for purchase (on board, >0 in bank)
                // 3. user has adequate funds for purchase
                // 4. 

                // First loop perfroms validity checks.
                let numTotalShares = 0;
                let totalPurchasePrice = 0;
                for (const [key, value] of Object.entries(updateData.purchase)) {
                    let purchasePricePerShare = game.state.share_prices[key];
                    let purchasePrice = purchasePricePerShare * value;

                    numTotalShares += value;
                    totalPurchasePrice += purchasePrice;
                    if(game.state.chains[key].length < 1){
                        return "chainNotOnBoard";
                    }
                    if(numTotalShares > 3){
                        return "tooManyShares";
                    }
                    if(value > game.state.bank_shares[key]){
                        return "notEnoughShares";
                    }
                    if(totalPurchasePrice > game.state.player_states[userID].cash){
                        return "notEnoughCash";
                    }
                }
                // Second loop updates game state.
                for (const [key, value] of Object.entries(updateData.purchase)) {
                    let purchasePricePerShare = game.state.share_prices[key];
                    let purchasePrice = purchasePricePerShare * value;

                    game.state.bank_shares[key] -= value;
                    game.state.player_states[userID][key] += value;
                    game.state.player_states[userID].cash -= purchasePrice;
                  }
                  

                if(updateData.endGame === true){
                    //TODO: check that player is allowed to end game.

                    //award prizes
                    this.awardPrizes(game, "endGame");
                    game.state.game_ended = true;
                }
                else {
                    game.state.player_states[userID].tiles.push(game.state.tile_bank.pop()) // Draws new tile.
                    //TODO: handle empty tile bank ------- NOTE: test for/handle other exceptions like this.
                    game.state.expectedNextAction = 'playTile';
                    game.state.play_count++;
                    game.state.turn = game.state.play_count % game.num_players;
                }
                break;
            default:
                console.log("Not a valid updateType.")
                return "invalidUpdateType";
                break;
        }


        if(JSON.stringify(game.state.active_merger) !== '{}'){ // merger is active.
            console.log("the merger is active,,, checking if we can give prizes yet");
            if(game.state.active_merger.remaining_chain !== 'p'){ // remaining chain has been selected.
                //pay prizes
                this.awardPrizes(game);
            }
        }

        return "success";
    };
}

module.exports = game;

