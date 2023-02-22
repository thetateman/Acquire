const aiHelpers = {
    net_stateToVector: function(state){
        // write state in usable format
        let stateVector = [];
        
        // player states, ex: [num_i_shares, num_c_shares, ..., cash]
        
        state.player_states.forEach((player) => {
            
            stateVector.push(player.net_worth);
        });
        stateVector.push(state.turn);
        return stateVector;
    },

    no_tiles_stateToVector: function(state){
        // write state in usable format
        let stateVector = [];
        
        // player states, ex: [num_i_shares, num_c_shares, ..., cash]
        
        state.player_states.forEach((player) => {
            
            let {
                total_time_remaining,
                action_time_remaining,
                out_of_total_time,
                out_of_action_time,
                tiles,
                ...extractedFeatures} = player;

            let playerStateVector = Object.values(extractedFeatures);
            stateVector = stateVector.concat(playerStateVector);
        });
        stateVector.push(state.turn);
        return stateVector;
    },

    stateToVector: function(state){
        // write state in usable format
        let stateVector = [];
        //create template state vector
        const bitBoardOffsets = {'i': 0, 'c': 1, 'w': 2, 'f': 3, 'a': 4, 't': 5, 'l': 6, 's': 7, 'p': 8};
        //tile types
        stateVector = stateVector.concat(new Array(972).fill(0));
        for(let y = 0; y<9; y++){
            for(let x = 0; x<12; x++){
                if(state.board[y][x] === 'e') continue;
                stateVector[(108 * bitBoardOffsets[state.board[y][x]]) + (y * 12) + x] = 1;
            }
        }
        // player states, ex: [num_i_shares, num_c_shares, ..., cash]
        let playerIndex = 0;
        let myTiles = new Array(108).fill(0);
        state.player_states.forEach((player) => {
            let {
                total_time_remaining,
                action_time_remaining,
                out_of_total_time,
                out_of_action_time,
                tiles,
                net_worth,
                ...extractedFeatures} = player;

            let playerStateVector = Object.values(extractedFeatures);
            stateVector = stateVector.concat(playerStateVector);
            if(playerIndex === state.turn){
                player.tiles.forEach(tile => myTiles[(tile.y * 12) + tile.x] = 1);
            }
            playerIndex++;
        });
        stateVector = stateVector.concat(myTiles);
        stateVector.push(state.turn);
        return stateVector;
    }
}

module.exports = aiHelpers;