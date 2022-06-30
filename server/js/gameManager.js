const fs = require('fs');

const gameManager = {

    initGameHistory: function(game){

    },

    appendEventToGameHistory: function(game, event){

    },

    restoreActiveGamesFromHistory: function(games){ // will need a tree of helper functions, how to structure this?

    },

    backupGamesObject: function(games){
        fs.writeFile('../server_data_backup/active_games.json', JSON.stringify(games), err => {
            if (err) {
              console.error(err);
            }
            // file written successfully
          });
    },

    restoreGamesObject: function(){
        let data;
        try{
            data = JSON.stringify(JSON.parse(fs.readFileSync('../server_data_backup/active_games.json', 'utf8')));
        }
        catch(err){
            console.error(`${Date()} Could not restore games: `, err);
            data = '{}';
        }
        let games = JSON.parse(data);
        for(let game in games){
            games[game].num_connected_players = 0; // No one is connected if we just started the server...
        }
        return games;
    },

    cleanGames: function(games, io){
        /**
        * Called at regular interval (every minute). Deletes games that have been inactive for over
        * 5 minutes.
        * @param {object} games - the in-memory games object on the server.
        * @param {string} io - socket.io server instance.
        *
        */
        for (let game in games) {
            if(games[game].num_connected_players <= 0){
                if(games[game].inactive_since === new Date(8640000000000000).getTime()){
                    // If there are no connected players and inactive_since is unset, set inactive_since now.
                    games[game].inactive_since = Date.now();
                }
            }
            if((Date.now() - games[game].inactive_since) > 1000 * 60 * 5){
                // If the game has been inactive for 5 minutes, delete the game.
                io.in('lobby').emit('gameListUpdate', {action: 'removeGame', game: game});
                delete games[game];
            }
        }
    },
}

module.exports = gameManager;