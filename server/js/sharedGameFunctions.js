const sharedGameFunctions = {
    getNeighbors: function (board, x, y){
        /**
        * Checks each tile adjacent to input and adds unique tile types to input
        * @returns {array} List of unique tile types adjacent to input tile (excludes 'e')
        */
        let connectingChains = [];
        if(y < 8){ //Check that row is in range
            if(board[y+1][x] !== 'e'){ // If tile is not empty and not outside the board
                if(!connectingChains.includes(board[y+1][x])){ // Check that we did not already add chain
                    connectingChains.push(board[y+1][x]); //Add chain to connectingChains
                }
            }
        }
        if(y > 0){
            if(board[y-1][x] !== 'e'){
                if(!connectingChains.includes(board[y-1][x])){
                    connectingChains.push(board[y-1][x]);
                }
            }
        }
        if(x < 11){
            if(board[y][x+1] !== 'e'){
                if(!connectingChains.includes(board[y][x+1])){
                    connectingChains.push(board[y][x+1]);
                }
            }
        }
        if(x > 0){
            if(board[y][x-1] !== 'e'){
                if(!connectingChains.includes(board[y][x-1])){
                    connectingChains.push(board[y][x-1]);
                }
            }
        }
        return connectingChains;
    },

    predictTileType: function(board, chains, available_chains, x, y){
        /**
        * Uses getNeighbors function and chain info to calculate the potential type of a tile.
        * predictedType should be in ['<chain>', 's'(single), 'm'(merger), 'n'(new chain), 'z'(asleep), 'd'(dead)].
        * @returns {string} Character representing the type a tile would be if played
        * 
        */
       let predictedType = 's';
       let neighbors = this.getNeighbors(board, x, y);
       let connectingTrueChains = neighbors.filter((f) => ['i', 'c', 'w', 'f', 'a', 't', 'l'].includes(f));
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
    },

    getMergerInfo: function(game, connectingTrueChains){
        let chains = game.state.chains
        let largestChains = [connectingTrueChains[0]];
        for(let i = 1; i < connectingTrueChains.length; i++){
            if(chains[connectingTrueChains[i]].length > chains[largestChains[0]].length){
                largestChains.length = 0;
                largestChains.push(connectingTrueChains[i]);
            }
            else if(chains[connectingTrueChains[i]].length === chains[largestChains[0]].length){
                largestChains.push(connectingTrueChains[i]);
            }
        }
        let remainingChain = 'p'; //pending, should change with next action
        if(largestChains.length === 1){
            remainingChain = largestChains[0];
        }
        // Build active_merger object for use in later game actions.
        let elimChains = connectingTrueChains.filter((chain) => chain !== remainingChain);
        // Sort eliminated chains by size, largest to smallest.
        elimChains.sort((a, b) => {
            if(chains[a].length < chains[b].length){
                return 1;
            } 
            else if(chains[a].length > chains[b].length) {
                return -1;
            }
            else{
                return 0;
            }
        });

        let playersDisposing = {};
        /**
         * The playersDisposing object holds the data representing which players 
         * need to dispose which shares, and in what order. Each key-value
         * pair is an eliminated chain, and an array of players who hold 
         * shares in that chain (in order of disposal turn). Example:
         * {
         *     'i': [0, 2, 3, 5],
         *     't': [1],
         *     'f': [5, 1, 3]
         * }
         * 
         */
        
        elimChains.forEach((chain) => {
            playersDisposing[chain] = [];
            for(let playerIndex=0; playerIndex<game.state.player_states.length; playerIndex++){
                if(game.state.player_states[playerIndex][chain] > 0){
                    playersDisposing[chain].push(playerIndex);
                }
            }
            
            // Find first player with shares, including or after merging player
            let firstDisposingPlayer;
            if(playersDisposing[chain].includes(game.state.turn)){
                firstDisposingPlayer = game.state.turn;
            }
            else{
                firstDisposingPlayer = playersDisposing[chain].find((player) => player >= game.state.turn);
                if(firstDisposingPlayer === undefined){
                    firstDisposingPlayer = playersDisposing[chain][0];
                }
            }
            
            // Re-order player array, starting with merging player or next player with shares
            let tempPlayerArr = playersDisposing[chain].splice(playersDisposing[chain].indexOf(firstDisposingPlayer));
            playersDisposing[chain] = tempPlayerArr.concat(playersDisposing[chain]);            
        });
        return {largestChains, remainingChain, elimChains, playersDisposing};
    },

    gameIsEndable: function(game){
        if(Object.values(game.state.chains).some((chain) => chain.length > 40) ||
            (!Object.values(game.state.chains).some((chain) => chain.length > 0 && chain.length < 11)
                && game.state.available_chains.length < 7))
        {
            return true;
        }
        else {
            return false;
        }
    },

    shuffleArray: function(arr) { // Fisher-Yates random shuffle.
        let newArray = JSON.parse(JSON.stringify(arr));
        for (let i = newArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },
}
module.exports = sharedGameFunctions;