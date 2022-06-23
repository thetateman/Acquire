class gameManager{

    static cleanGames(games, io){
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
    }
}

module.exports = gameManager;