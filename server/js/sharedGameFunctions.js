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
}
module.exports = sharedGameFunctions;