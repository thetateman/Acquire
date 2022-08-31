const sharedGameFunctions = require("./sharedGameFunctions.js");
const internalGameFunctions = {

    //------------------Game Creation Helper Functions------------------------
    
    genNewGameID: function(games){ 
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
    },

    genTileBank: function(){
        let tileBank = [];
        for(let i = 0; i < 12; i++){
            for(let j = 0; j < 9; j++){
                tileBank.push({x: i, y: j});
            }
        }
        tileBank = sharedGameFunctions.shuffleArray(tileBank);
        return tileBank;
    },

    //------------------Game Update Helper Functions------------------------
    
    tilePlacer: function(board, chains, share_prices, active_merger, x, y, game, gameStarted=true){
        //updates board with new tile, returns string in ["normal", "newChain", "merger"]
        let placementType = 'normal';
        let tileChain = 's';
        if(!gameStarted){ // Placing turn-order tiles.
            board[y][x] = tileChain;
            return placementType;
        }
        let connectingChains = sharedGameFunctions.getNeighbors(board, x, y); // List of unique chains adjacent to new tile

        if(connectingChains.length > 0){
            if(connectingChains.every((element) => element === 's')){
                placementType = 'newChain';
                tileChain = 'p' //pending, should change with next action
            }
            else {
                let connectingTrueChains = connectingChains.filter((f) => f !== 's');
                if(connectingTrueChains.length === 1){
                    tileChain = connectingTrueChains[0];
                    chains[tileChain].push({'x': x, 'y': y});
                    let connectedSingleTiles = this.getConnectingSingles(board, x, y);
                    chains[tileChain] = chains[tileChain].concat(connectedSingleTiles);
                    connectedSingleTiles.forEach((tile) => {board[tile.y][tile.x] = tileChain;});
                    this.updatePrice(tileChain, chains, share_prices);
                    

                }
                else { // there is a merger
                    let {largestChains, remainingChain, elimChains, playersDisposing} = sharedGameFunctions.getMergerInfo(game, connectingTrueChains);

                    active_merger.elim_chains_ranked = this.rankEliminatedChainsBySize(chains, elimChains, remainingChain);  // May be updated by chooseRemainingChain action.
                    active_merger.players_disposing = playersDisposing; // May be updated by chooseRemainingChain action.
                    active_merger.merging_chains = connectingTrueChains;
                    active_merger.largest_chains = largestChains;
                    active_merger.remaining_chain = remainingChain;
                    active_merger.elim_chains = elimChains; // May be updated by chooseRemainingChain action.
                    active_merger.disposing_chain_index = 0;
                    active_merger.player_disposing_index = 0;
                    active_merger.merging_player = game.state.turn;
                    
                    placementType = 'merger';
                    tileChain = 'p'; //pending, should change with next action
                }
            }
        }
        board[y][x] = tileChain; //maybe change for non-normal cases
        return placementType;

        
    },

    rankEliminatedChainsBySize: function(chains, elimChains, remainingChain){
        let elimChainsRanked = [];
        if(remainingChain !== 'p'){ //only if these are the true elim chains, otherwise, handle this in chooseRemainingChain.
            elimChainsRanked = [[elimChains[0]]];
            let chainRankIndex = 0;
            for(let i=1; i<elimChains.length; i++){
                if(!(chains[elimChains[i]].length === chains[elimChainsRanked[chainRankIndex][0]].length)){
                    chainRankIndex++;
                    elimChainsRanked.push([]);
                }
                elimChainsRanked[chainRankIndex].push(elimChains[i]);

            }
        }
        return elimChainsRanked;
    },

    isNextElimChainTied: function(game){
        const nextElimChain = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
        let isTied = false;
        game.state.active_merger.elim_chains_ranked.forEach((chainGroup) => {
            if(chainGroup.includes(nextElimChain)){
                if(chainGroup.length > 1){
                    isTied = true;
                }
            }
        });
        return isTied;
    },

    getConnectingSingles: function(board, x, y){
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
    },
    
    // Update the price of a chain
    updatePrice: function(chain, chains, share_prices){
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
        if(chains[chain].length <= 0){
            finalPrice = 0;
        }
        else if(chains[chain].length <= 6){
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
    },

    awardPrizes: function(game, reason='merger'){
        let elimChains = [];
        let unrealizedPrizes = [];
        for(let i=0;i<game.num_players;i++){
            unrealizedPrizes.push(0);
        }
        if(reason === 'merger'){
            elimChains = elimChains.concat(game.state.active_merger.merging_chains.filter((chain) => chain !== game.state.active_merger.remaining_chain));
            elimChains.forEach((chain) => game.state.available_chains.push(chain));
        }
        else if(reason === "endGame" || reason === 'calcUnrealizedPrizes'){
            // "elimChains" is every chain on the board
            elimChains = elimChains.concat(['i', 'c', 'a', 'w', 'f', 'l', 't'].filter((chain) => !game.state.available_chains.includes(chain)));
        }
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
            if(firstPlaces.length === 0){
                //console.log(`No ${elimChains[i]} shares, skipping prizes. (should only happen in debug).`);
                continue;
            }
            if(firstPlaces.length > 1){ //first place tie
                // all players who tie for first place split first and second place awards.
                let combinedReward = 15 * game.state.share_prices[elimChains[i]]; 
                let splitReward = combinedReward / firstPlaces.length;
                splitReward = Math.ceil(splitReward/100)*100; //Rounding up to 100th place.
                for(let k = 0; k < firstPlaces.length; k++){
                    if(reason === 'calcUnrealizedPrizes'){
                        unrealizedPrizes[firstPlaces[k]] += splitReward;
                    }
                    else{
                        game.state.player_states[firstPlaces[k]].cash += splitReward;
                    }
                    //console.log(`Player ${firstPlaces[k]} tied for first and receives ${splitReward} for ${elimChains[i]}`);
                }
            }
            else{ // no tie for first
                // award first place prize
                if(reason === 'calcUnrealizedPrizes'){
                    unrealizedPrizes[firstPlaces[0]] += 10 * game.state.share_prices[elimChains[i]];
                }
                else{
                    game.state.player_states[firstPlaces[0]].cash += 10 * game.state.share_prices[elimChains[i]];
                }
                //get list of players in second place
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
                if(secondPlaces.length === 0){
                    secondPlaces.push(firstPlaces[0]);
                    //console.log(`No one had second in ${elimChains[i]}, giving second place prize to ${firstPlaces[0]}`);
                }
                if(secondPlaces.length > 1){ //tie for second
                    let splitReward = 5 * game.state.share_prices[elimChains[i]] / secondPlaces.length;
                    splitReward = Math.ceil(splitReward/100)*100; //Rounding up to 100th place.
                    for(let k = 0; k < secondPlaces.length; k++){
                        if(reason === 'calcUnrealizedPrizes'){
                            unrealizedPrizes[secondPlaces[k]] += splitReward;
                        }
                        else{
                            game.state.player_states[secondPlaces[k]].cash += splitReward;
                        }
                        //console.log(`Player ${firstPlaces[k]} tied for second and receives ${splitReward} for ${elimChains[i]}`);
                    }
                }
                else {
                    /*
                    console.log(`No ties: ${5 * game.state.share_prices[elimChains[i]]} to player ` +
                        `${secondPlaces[0]} for ${elimChains[i]}.`);
                    */
                    if(reason === 'calcUnrealizedPrizes'){
                        unrealizedPrizes[secondPlaces[0]] += 5 * game.state.share_prices[elimChains[i]];
                    }
                    else{
                        game.state.player_states[secondPlaces[0]].cash += 5 * game.state.share_prices[elimChains[i]];
                    }
                }
            }
        }
        if(reason === 'calcUnrealizedPrizes') return unrealizedPrizes;
    },

    updateNetWorths: function(game){
        let unrealizedPrizes = this.awardPrizes(game, 'calcUnrealizedPrizes');
        let playerIndex = 0;
        game.state.player_states.forEach((player) => {
            let totalShareValue = 0;
            ['i', 'c', 'w', 'f', 'a', 't', 'l'].forEach((chain) => {
                totalShareValue += game.state.share_prices[chain] * player[chain];
            });
            if(game.state.game_ended){
                totalShareValue = 0;
            }
            player.net_worth = player.cash + totalShareValue + unrealizedPrizes[playerIndex];
            playerIndex++;
        });
    },

    endTurn: function(game){
        if(game.state.no_playable_tile_turns === 0){ // if this player was able to play a tile
            // Draw new tile
            if(game.state.tile_bank.length !== 0){
                let numDeadTiles = 0;
                let newTile = game.state.tile_bank.pop()
                newTile.predicted_type = sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, newTile.x, newTile.y);
                while(newTile.predicted_type === 'd'){
                    numDeadTiles++;
                    game.state.drawnDeadTiles.push(newTile);
                    if(game.state.tile_bank.length <= 0){
                        newTile = false;
                        break;
                    }
                    newTile = game.state.tile_bank.pop()
                    newTile.predicted_type = sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, newTile.x, newTile.y);
                }
                game.state.num_new_dead_tiles = numDeadTiles;
                if(newTile){
                    game.state.player_states[game.state.turn].tiles.push(newTile);
                }
            }
        }
        else if(game.state.no_playable_tile_turns >= game.num_players){
            this.endGame(game);
            return false;
        }
        //Turn over, pause time.
        //game.state.player_states[game.state.turn].out_of_action_time = false;
        game.state.player_states[game.state.turn].timerTotal.pause();
        //game.state.player_states[game.state.turn].timerAction.reset();
        //game.state.player_states[game.state.turn].timerAction.pause();
        //increment turn
        game.state.play_count++;
        game.state.turn = game.state.play_count % game.num_players;
        game.state.player_states[game.state.turn].timerTotal.resume();
        //game.state.player_states[game.state.turn].timerAction.resume();

        //determine if new player has a playable tile
        if(!game.state.player_states[game.state.turn].tiles.some((tile) => !['z', 'd'].includes(tile.predicted_type))){
            //TODO: send message to chat about this
            game.state.no_playable_tile_turns++;
            if(this.shouldAutoPass(game)){
                this.endTurn(game);
            }
            else {
                game.state.expectedNextAction = 'purchaseShares';
            }
        }
        else{
            game.state.no_playable_tile_turns = 0;
            game.state.expectedNextAction = 'playTile';
        }
    },

    shouldAutoPass: function(game){
        if(!(Object.values(game.state.share_prices).some((share_price) => share_price <= game.state.player_states[game.state.turn].cash && share_price !== 0))
            || game.state.available_chains.length === 7)
        {
            if(!sharedGameFunctions.gameIsEndable(game)){
                return true;
            }
        }
        return false;

    },

    endGame: function(game){
        //award prizes
        //this.awardPrizes(game, "endGame");
        this.updateNetWorths(game);

        //determine player placements
        let usernamesRanked = JSON.parse(JSON.stringify(game.usernames));
        let places = [];
        let networths = [];
        usernamesRanked.sort((a, b) => {
            if(game.state.player_states[game.usernames.indexOf(a)].net_worth < game.state.player_states[game.usernames.indexOf(b)].net_worth){
                return 1;
            }
            else {
                return -1
            }
        });
        
        for(let i=0;i<game.num_players;i++){
            places.push([]);
            networths.push(game.state.player_states[game.usernames.indexOf(usernamesRanked[i])].net_worth);
        }
        places[0].push(usernamesRanked[0]);
        let placeIndex = 0;
        for(let i=1; i<usernamesRanked.length; i++){
            if(!(game.state.player_states[game.usernames.indexOf(usernamesRanked[i])].net_worth === game.state.player_states[game.usernames.indexOf(places[placeIndex][0])].net_worth)){
                placeIndex++;
            }
            places[placeIndex].push(usernamesRanked[i]);
        }
        game.state.game_ended = true;
        game.places = places;
        game.usernames_ranked = usernamesRanked;
        game.final_net_worths = networths;
    },
    
    createGame: function(games, maxPlayers, timePerPlayer, creator){
        let id = this.genNewGameID(games);
        let newGame = {
            id: id,
            creator: creator,
            num_players: 0,
            num_connected_players: 0,
            inactive_since: new Date(8640000000000000).getTime(),
            max_players: maxPlayers,
            time_per_player: timePerPlayer * 1000 * 60,
            players_timed_out: [],
            usernames:[],
            watchers:[],
            state: {
                game_started: false,
                game_ended: false,
                turn: 0,
                play_count: 0,
                no_playable_tile_turns: 0,
                num_new_dead_tiles: 0,
                expectedNextAction: 'playTile',
                lastPlayedTile: {},
                lastActionData: {},
                drawnDeadTiles: [],
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
    },

    callUpdateGameWithExpectedArgs: function(game, updateData, {admin=false, computer=true, verbose=false}={}){
        /**
         * Updates game using current turn and expected next action.
         * DON'T use for user generated actions! (does not verify that it is the acting user's turn)
         * @param {object} game - the game to be updated.
         * @param {object} updateData - action details, e.g., coordinates of tile played.
         * @param {boolean} admin - updater is using administrator privilages to override game rules.
         * @param {boolean} computer - move was made by computer player.
         * @param {boolean} verbose - enables verbose logging
         * @returns {string} 'Success' or error string
         */
        return this.updateGame(game, game.usernames[game.state.turn], game.state.expectedNextAction, updateData, {admin: admin, computer: computer, verbose: verbose});
    },

    updateGame: function(game, username, updateType, updateData, {admin=false, computer=false, verbose=false}={}){
        /**
        * Called after receiving game updating websocket message, updates in-memory game object.
        * @param {object} game - the game to be updated.
        * @param {string} username - the username of the user who initiated the action.
        * @param {string} updateType - updateType should be in: ['joinGame', 'startGame', 'playTile', 'chooseNewChain', 'chooseRemainingChain', 'chooseNextElimChain', 'disposeShares', 'purchaseShares'].
        * @param {object} updateData - action details, e.g., coordinates of tile played.
        * @param {boolean} admin - updater is using administrator privilages to override game rules.
        * @param {boolean} computer - move was made by computer player.
        * @param {boolean} verbose - enables verbose logging
        * @returns {string} 'Success' or error string
        */

        // Handle metagame update types
        if(updateType === 'joinGame'){
            if(game.state.game_started){
                return "gameAlreadyStarted";
            }
            if(game.usernames.includes(username)){
                return "userAlreadyInGame";
            }
            if(game.max_players === game.usernames.length){
                return "gameFull";
            }
            else{
                game.num_players++;
                game.usernames.push(username);
                game.state.player_states.push({
                    total_time_remaining: null,
                    action_time_remaining: null,
                    out_of_total_time: false,
                    out_of_action_time: false,
                    tiles: [],
                    cash: 6000,
                    net_worth: 6000,
                    i: 0,
                    c: 0,
                    w: 0, 
                    f: 0,
                    a: 0, 
                    t: 0,
                    l: 0
                    });
                return "success";
            }
        }
        else if(updateType === 'startGame'){
            if(username !== game.usernames[0]){
                return "onlyCreatorMayStartGame";
            }
            if(game.state.game_started){
                return "gameAlreadyStarted";
            }
            else{
                // Draw first tiles to determine turn order
                let firstTiles = [];
                for(let i=0; i<game.num_players; i++){
                    firstTiles.push(game.state.tile_bank.pop());
                }
                let tileIndicies = Object.keys(firstTiles);
                tileIndicies.sort((a, b) => {
                    if(firstTiles[a].x > firstTiles[b].x){
                        return 1;
                    }
                    else if(firstTiles[a].x < firstTiles[b].x){
                        return -1;
                    } 
                    else{
                        if(firstTiles[a].y > firstTiles[b].y){
                            return 1;
                        } 
                        else if(firstTiles[a].y < firstTiles[b].y){
                            return -1;
                        }
                        else{
                            if(verbose){console.log("Something went wrong, and we tried to compare the same tile!");}
                            return 0;
                        }
                    }
                });
                // Map the usernames to sorted tileIndicies, so the usernames are sorted by the tile they played.
                game.usernames = tileIndicies.map((index) => {
                    return game.usernames[index];
                });

                firstTiles.forEach((tile) => {
                    this.tilePlacer(game.state.board, game.state.chains, game.state.share_prices, game.state.active_merger, tile.x, tile.y, game, game.state.game_started);
                });
                game.state.game_started = true;
                // Draw initial six tiles
                for(let i=0; i<game.num_players; i++){
                    for(let j=0; j<6; j++){
                        let newTile = game.state.tile_bank.pop()
                        newTile.predicted_type = sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, newTile.x, newTile.y);
                        game.state.player_states[i].tiles.push(newTile);
                    }
                }
                
                return "success";
            }
        }

        //username is passed in as a string, here we convert it to the
        //player number that represents that user in this game.
        let userID = game.usernames.indexOf(username);
        if(verbose){console.log(userID);}

        //Verify legality of game action. More verification is done on specific action types.
        if(userID === -1){
            return "userNotInGame";
        }
        else if(!game.state.game_started && !admin){
            return "gameHasNotStarted";
        }
        else if(game.state.game_ended){
            return "gameEnded";
        }
        else if(userID !== game.state.turn && !admin){
            return 'notPlayersTurn';
        }
        else if (updateType !== game.state.expectedNextAction && !admin){
            return 'unexpectedActionType';
        }
        else if(!computer){
            if(game.state.player_states[game.state.turn].out_of_action_time){
                return 'outOfActionTime';
            }
            if(game.state.player_states[game.state.turn].out_of_total_time){
                return 'outOfTotalTime';
            }
        }

        //Player made an action, reset the action timer
        //game.state.player_states[game.state.turn].timerAction.reset();
        game.state.lastActionData = updateData;
        switch(updateType){
            case 'playTile':
                //check that action is legal
                if((! (0 <= updateData.x && updateData.x <= 11)) || (! (0 <= updateData.y && updateData.y <= 8))){
                    return "tileOutsideBoard";
                } 
                if(game.state.board[updateData.y][updateData.x] !== 'e'){
                    return "tileAlreadyPlayed";
                }
                if(!admin && !game.state.player_states[userID].tiles.some((tile) => updateData.x === tile.x && updateData.y === tile.y)){
                    return "userLacksTile";
                }
                if(['z', 'd'].includes(sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, updateData.x, updateData.y))){
                    return "tileDeadOrAsleep";
                }
                // Remove tile from player hand
                game.state.player_states[userID].tiles = game.state.player_states[userID].tiles.filter((tile) => !(updateData.x === tile.x && updateData.y === tile.y));
                //update the game
                game.state.lastPlayedTile = updateData;
                switch(this.tilePlacer(game.state.board, game.state.chains, game.state.share_prices, game.state.active_merger, updateData.x, updateData.y, game)){
                    case 'normal':
                        if(this.shouldAutoPass(game)){
                            this.endTurn(game);
                        }
                        else{
                            game.state.expectedNextAction = 'purchaseShares';
                        }
                        break;
                    case 'newChain':
                        game.state.expectedNextAction = 'chooseNewChain';
                        break;
                    case 'merger':
                        if(game.state.active_merger.remaining_chain === 'p'){ // If waiting on chain choice
                            game.state.expectedNextAction = 'chooseRemainingChain';
                        }
                        else{
                            this.awardPrizes(game);
                            if(this.isNextElimChainTied(game)){
                                game.state.turn = game.state.active_merger.merging_player;
                                console.log("setting action to chooseNextElimChain");
                                game.state.expectedNextAction = 'chooseNextElimChain';
                            }
                            else{
                                // Update turn to first player to dispose shares.
                                let disposingChain = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
                                game.state.turn = game.state.active_merger.players_disposing[disposingChain][game.state.active_merger.player_disposing_index];

                                game.state.expectedNextAction = 'disposeShares';
                            }
                        }
                        game.state.lastPlayedTile = updateData;
                        if(verbose){console.log(game.state.active_merger);}
                        break;
                    default:
                        if(verbose){console.log("Not a valid placement type.");}
                }
                //update tile type predictions for all players
                game.state.player_states.forEach((player) => {
                    player.tiles.forEach((tile) => {
                        tile.predicted_type = sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, tile.x, tile.y);
                        player.has_playable_tile = true;
                    });
                });
                        
                this.updateNetWorths(game);


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

                // Bonus share for creating chain
                if(game.state.bank_shares[updateData.newChainChoice] > 0){
                    game.state.bank_shares[updateData.newChainChoice]--;
                    game.state.player_states[game.state.turn][updateData.newChainChoice]++;
                }

                //update tile type predictions for all players
                game.state.player_states.forEach((player) => {
                    player.tiles.forEach((tile) => {
                        tile.predicted_type = sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, tile.x, tile.y);
                    });
                });

                this.updateNetWorths(game);

                if(this.shouldAutoPass(game)){
                    this.endTurn(game);
                }
                else{
                    game.state.expectedNextAction = 'purchaseShares';
                }
                break;
            case 'chooseRemainingChain':
                if(game.state.active_merger.remaining_chain === 'p'){
                    if(game.state.active_merger.largest_chains.includes(updateData.remainingChainChoice)){
                        //Update active_merger object based on chain choice.
                        game.state.active_merger.remaining_chain = updateData.remainingChainChoice;
                        game.state.active_merger.elim_chains = game.state.active_merger.elim_chains.filter((chain) => chain !== game.state.active_merger.remaining_chain);
                        delete game.state.active_merger.players_disposing[game.state.active_merger.remaining_chain];

                        // Rank eliminated chains by size to handle ties.
                        game.state.active_merger.elim_chains_ranked = this.rankEliminatedChainsBySize(game.state.chains, game.state.active_merger.elim_chains, game.state.active_merger.remainingChain);

                        this.awardPrizes(game);
                        this.updateNetWorths(game);
                        
                        if(this.isNextElimChainTied(game)){
                            game.state.turn = game.state.active_merger.merging_player;
                            game.state.expectedNextAction = 'chooseNextElimChain';
                        }
                        else {
                            // Update turn to first player to dispose shares.
                            let disposingChain = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
                            game.state.turn = game.state.active_merger.players_disposing[disposingChain][game.state.active_merger.player_disposing_index];
                            
                            game.state.expectedNextAction = 'disposeShares';
                        }
                    }
                    else {
                        return "notLargestChainInMerger";
                    }
                }
                break;
            case 'chooseNextElimChain':
                // Check eligibility
                let chainIsEligibleForElim = false;
                let disposingChainDefault = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
                game.state.active_merger.elim_chains_ranked.forEach((chainGroup) => {
                    if(chainGroup.includes(updateData.nextElimChain)){
                        if(chainGroup.length > 1 && chainGroup.includes(disposingChainDefault)){
                            chainIsEligibleForElim = true;
                        }
                    }
                });
                if(!chainIsEligibleForElim){
                    return 'chainIsNotEligibleForElim';
                }

                console.log(`choosing next elim chain as: ${updateData.nextElimChain}`);
                // Move nextElimChain to the front of elim_chains
                game.state.active_merger.elim_chains.splice(game.state.active_merger.disposing_chain_index, 0,
                    game.state.active_merger.elim_chains.splice(
                        game.state.active_merger.elim_chains.indexOf(updateData.nextElimChain), 1
                    )[0]
                );

                //filter nextElimChain from elim_chains_ranked
                for(let i=0; i<game.state.active_merger.elim_chains_ranked.length; i++){
                    game.state.active_merger.elim_chains_ranked[i] = 
                    game.state.active_merger.elim_chains_ranked[i].filter((rankedChain) => rankedChain !== updateData.nextElimChain);

                }

                // Update turn to next player expected to dispose shares
                let disposingChainUpdated = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
                game.state.turn = game.state.active_merger.players_disposing[disposingChainUpdated][game.state.active_merger.player_disposing_index];
                game.state.expectedNextAction = 'disposeShares';
                break;

            case 'disposeShares':
                let disposingChain = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
                // Check that disposal is allowed
                let sumShareDisposal = updateData.sell + updateData.trade + updateData.keep;
                if(sumShareDisposal !== game.state.player_states[game.state.turn][disposingChain]){
                    return 'disposedIncorrectNumberOfShares';
                }
                if(updateData.trade % 2 !== 0){
                    return 'mayOnlyTradeIncrementsOfTwoShares';
                }
                if(game.state.bank_shares[game.state.active_merger.remaining_chain] < updateData.trade / 2){
                    return 'notEnoughSharesToTradeFor';
                }

                // Dispose the shares
                // Trade Shares:
                game.state.player_states[userID][disposingChain] -= updateData.trade;
                game.state.player_states[userID][game.state.active_merger.remaining_chain] += updateData.trade / 2;
                game.state.bank_shares[disposingChain] += updateData.trade;
                game.state.bank_shares[game.state.active_merger.remaining_chain] -= updateData.trade / 2;

                // Sell shares:
                game.state.player_states[userID][disposingChain] -= updateData.sell;
                game.state.player_states[userID].cash += updateData.sell * game.state.share_prices[disposingChain];
                game.state.bank_shares[disposingChain] += updateData.sell;

                // Increment expected disposal
                game.state.active_merger.player_disposing_index++;
                if(game.state.active_merger.player_disposing_index === game.state.active_merger.players_disposing[disposingChain].length){ //All shares of current chain disposed
                    game.state.active_merger.player_disposing_index = 0;
                    game.state.active_merger.disposing_chain_index++;
                    if(game.state.active_merger.disposing_chain_index === game.state.active_merger.elim_chains.length){ // All shares disposed
                        let mergingTile = game.state.lastPlayedTile;
                        let mergingChainTiles = [mergingTile];
                        let elimChains = game.state.active_merger.elim_chains;
                        elimChains.forEach((chain) => {
                            mergingChainTiles = mergingChainTiles.concat(JSON.parse(JSON.stringify(game.state.chains[chain])));
                            game.state.chains[chain] = [];
                            //game.state.available_chains.push(chain); //moved to awardPrizes() to avoid apparent duplicate prize money in net worth calculation during mergers.
                            if(verbose){console.log(`merging off: ${chain}`);}
                        });
                        mergingChainTiles = mergingChainTiles.concat(
                            this.getConnectingSingles(game.state.board, mergingTile.x, mergingTile.y));
                        game.state.chains[game.state.active_merger.remaining_chain] = game.state.chains[game.state.active_merger.remaining_chain].concat(mergingChainTiles);
                        //mergingChainTiles.forEach((tile) => {game.state.board[tile.y][tile.x] = game.state.active_merger.remaining_chain;});
                        for(let i = 0; i < mergingChainTiles.length; i++){
                            let currentTile = mergingChainTiles[i];
                            game.state.board[currentTile.y][currentTile.x] = game.state.active_merger.remaining_chain;
                        }
                        game.state.active_merger.merging_chains.forEach((chain) => {
                            this.updatePrice(chain, game.state.chains, game.state.share_prices)
                        });
                        
                        // Reset turn to merging player
                        game.state.turn = game.state.active_merger.merging_player;
                        
                        //merger operations complete, clear active_merger object
                        game.state.active_merger = {};

                        //update tile type predictions for all players
                        game.state.player_states.forEach((player) => {
                            player.tiles.forEach((tile) => {
                                tile.predicted_type = sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, tile.x, tile.y);
                            });
                        });

                        if(this.shouldAutoPass(game)){
                            this.endTurn(game);
                        }
                        else{
                            game.state.expectedNextAction = 'purchaseShares';
                        }
                    }
                    else{
                        if(this.isNextElimChainTied(game)){
                            game.state.turn = game.state.active_merger.merging_player;
                            game.state.expectedNextAction = 'chooseNextElimChain';
                        }
                        else {
                            // Update turn to next player expected to dispose shares
                            disposingChain = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
                            game.state.turn = game.state.active_merger.players_disposing[disposingChain][game.state.active_merger.player_disposing_index];
                        }
                    }
                }
                else{
                    // Update turn to next player expected to dispose shares 
                    game.state.turn = game.state.active_merger.players_disposing[disposingChain][game.state.active_merger.player_disposing_index];
                }
                this.updateNetWorths(game);
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
                    if(!['i', 'c', 'w', 'f', 'a', 't', 'l'].includes(key)){
                        return "notAChain";
                    }
                    if(!Number.isInteger(value)){
                        return "purchaseValueMustBeInt";
                    }
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
                this.updateNetWorths(game);

                if(updateData.endGame === true){
                    if(sharedGameFunctions.gameIsEndable(game)){
                        this.endGame(game);
                    }
                    else {
                        return 'gameCannotBeEnded';
                    }
                }
                else {
                    this.endTurn(game);
                }
                break;
            default:
                if(verbose){console.log("Not a valid updateType.");}
                return "invalidUpdateType";
                break;
        }
        return "success";
    },
}

module.exports = internalGameFunctions;

