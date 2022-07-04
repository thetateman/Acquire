const internalGameFunctions = require("./internalGameFunctions.js");
const Timer = require("./timers.js");
const computerPlayer = require("./computerPlayer.js");

const gameMessages = {
    testcount: 0,
    registerGameMessageHandlers: function(games, io, sock, userStatuses, usersInLobby, verbose){
        /**
        * Sets listener/handlers for game messages on the socket instance. Includes in-game actions
        * joining/disconnecting from a game or lobby, creating a game.
        * @param {object} games - the in-memory games object on the server.
        * @param {object} io - the Socket.io server instance.
        * @param {object} sock - the Socket.io socket instance.
        * @param {array} usersInLobby - list of usernames in lobby
        * @param {object} userStatuses - status or location of users.
        * @param {boolean} verbose - verbose flag, set by environment variable.
        * 
        */

        sock.on('gameAction', this.gameActionHandler(games, io, sock, verbose));

        sock.on('joinLobby', () => {
            sock.join('lobby');
            sock.emit('lobbyUpdate', {action: 'add', users: usersInLobby});
            usersInLobby.push(sock.request.session.username);
            sock.request.session.lastKnownLocation = 'lobby';
            userStatuses[sock.request.session.username] = 'lobby';
            io.in('lobby').emit('lobbyUpdate', {action: 'add', users: [sock.request.session.username]});
        });
    
        sock.on('gameRequest', gameID => {
            let requestingUser = sock.request.session.username;
            if(gameID === "all"){
                //TODO: add additional game data to summaries
                let gameSummaries = {};
                let usernameDetails = {};
                for (const [key, value] of Object.entries(games)) {
                    value.usernames.forEach((username) => {
                        usernameDetails[username] = {'username': username, location: userStatuses[username], admin: false};
                    });
                    gameSummaries[key] = {
                        usernames: value.usernames,
                        playerDetails: usernameDetails,
                        max_players: value.max_players,
                        game_started: value.state.game_started,
                        game_ended: value.state.game_ended
                    };
                }
                sock.emit('gameResponse', gameSummaries);
            }else{
                if(!Object.keys(games).includes(gameID)){
                    if(verbose){console.log("Requested a game that does not exist!");}
                    sock.emit('gameResponse', "none");
                }
                else{ // Whenever a user hits a game page (for a game that exists). TODO: move this code somewhere more logical.
                    games[parseInt(gameID, 10)].num_connected_players++;
                    // Unset inactive_since
                    games[parseInt(gameID, 10)].inactive_since = new Date(8640000000000000).getTime();
                    const requestedGameCopy = this.getSendableGame(games[parseInt(gameID, 10)], requestingUser);
                    sock.emit('gameResponse', requestedGameCopy);
                    sock.data.username = requestingUser;
                    sock.request.session.lastKnownLocation = `game${gameID}`;
                    userStatuses[sock.request.session.username] = `game${gameID}`;
                    io.in('lobby').emit('gameListUpdate', {action: 'addPlayer', game: {id: gameID}, username: sock.request.session.username});
                    sock.join(gameID); //typeOf(gameID) = string
                }
            }
            
        });
        sock.on('newGame', ({numPlayers, timePerPlayer, quitProof}) => {
            // creator arg no longer used, left in place for demonstration
            const newGameID = internalGameFunctions.createGame(games, parseInt(numPlayers, 10), timePerPlayer, quitProof, sock.request.session.username);
            let usernameDetails = {};
            usernameDetails[games[newGameID].usernames[0]] = {username: games[newGameID].usernames[0], location: userStatuses[games[newGameID].usernames[0]], admin: false};
            const gameSummary = {
                id: newGameID,
                usernames: games[newGameID].usernames,
                playerDetails: usernameDetails,
                max_players: games[newGameID].max_players,
                game_started: games[newGameID].state.game_started,
                game_ended: games[newGameID].state.game_ended
            };
            const updateObject = {
                "action": "addGame",
                "game": gameSummary
            }
            io.in('lobby').emit('gameListUpdate', updateObject);
             
        });
    },

    //---------------Game Message Handlers-----------------------------

    gameActionHandler: (games, io, sock, verbose) => ({game_id, updateType, updateData}) => {
        // io and sock will be null if game action was generated by computerPlayer.
        //if(verbose){console.time('gameAction');}
        if(!Object.keys(games).includes(game_id.toString())){
            if(verbose){console.log("Requested a game that does not exist!");}
            //sock.emit('error', "none"); //TODO: add catch-all error listener to client.
            return false;
        }
        if(verbose){console.log(`Game update: game: ${game_id}, updateType: ${updateType}, updateData: ${JSON.stringify(updateData)}`);}
        let updateResult;
        try{
            if(sock === null){ // move made by computer
                updateResult = internalGameFunctions.callUpdateGameWithExpectedArgs(games[game_id], updateData, {admin: false, verbose: verbose});
            }
            else{
                updateResult = internalGameFunctions.updateGame(games[game_id], sock.request.session.username, updateType, updateData, {admin: false, verbose: verbose});
            }
        } 
        catch(err){
            console.error(`${Date()} ################ Internal game update error #################`);
            console.error(`Attempted: Game update: game: ${game_id}, updateType: ${updateType}, updateData: ${JSON.stringify(updateData)}`);
            console.error(err);
            console.error(`Game object dump: ${JSON.stringify(games[game_id])}`);
        }
        if(updateResult !== "success"){
            /**
             * Game did not successfully update upon an action attempted by this player. Game state on server *should*
             * be unchanged. No other players are notified of the action or it's error status. The server sends
             * a message to reset the acting player's UI components to their state prior to the unaccepted action.
             */
            if(verbose){console.log(`Failed to update game because: ${updateResult}.`);}
            if(sock){sock.emit('gameUpdate', {type: updateType, game: gameMessages.getSendableGame(games[game_id], sock.request.session.username), error: updateResult});}
            return false;
        }
        
        if(updateType === "joinGame"){
            const playerNum = games[game_id].usernames.indexOf(sock.request.session.username);
            const gameUpdate = {
                type: "joinGame",
                joining_player: sock.request.session.username,
                player_num: playerNum,
                player_data: games[game_id].state.player_states[playerNum],
                // Not sure if we need to send player data or not,
                // is there any case where we could not infer all the data on the client-side?
            };
            io.in(game_id.toString()).emit('gameUpdate', gameUpdate);
        }
        else if(updateType === 'startGame'){
            //Set Timers on players. Logically I feel like this should happen in updateGame, but I want to keep IO out of internalGameFunctions
            for(let i=0; i<games[game_id].num_players; i++){
                games[game_id].state.player_states[i].timerTotal = new Timer(() => {
                    games[game_id].state.player_states[i].out_of_total_time = true;
                    gameMessages.makeAndSendComputerMove(games, game_id, io, verbose); // TODO: can't call this twice
                }, 20000);
                if(i !== 0){
                    games[game_id].state.player_states[i].timerTotal.pause();
                }
            }
            gameMessages.emitGameToPlayers(games, game_id, updateType, io);
        }
        else{
            if(games[game_id].state.player_states[games[game_id].state.turn].out_of_total_time){
                gameMessages.makeAndSendComputerMove(games, game_id, io, verbose);
            }
            else{
                gameMessages.emitGameToPlayers(games, game_id, updateType, io);
            }
        }
        //if(verbose){console.timeEnd('gameAction');}
    },

    // --------------Game Message helper functions --------------------
    getSendableGame: function(game, requestingUser){
        //We send a modified copy of the game object to the client, after removing secret data.
        let requestedGameCopy = JSON.parse(JSON.stringify(game)); 
        const requestingUsersPlayerID = requestedGameCopy.usernames.indexOf(requestingUser);
        for(let i=0; i<requestedGameCopy.num_players; i++){
            if(i === requestingUsersPlayerID){
                continue;
            }
            requestedGameCopy.state.player_states[i].tiles = [];
        }
        requestedGameCopy.state.tile_bank = [];
        return requestedGameCopy;
    },

   emitGameToPlayers: function(games, game_id, updateType, io){
        /**
         * Sends gameUpdate message to players in that game, uses getSendableGame() to send each player
         * a game object that does not include secret data from the game or other players.
         * @param {int} game_id 
         */
        io.in(game_id.toString()).fetchSockets()
        .then((sockets) => {
            sockets.forEach((playerSocket) => {
                playerSocket.emit('gameUpdate', {type: updateType, game: this.getSendableGame(games[game_id], playerSocket.data.username)});
            });
        });
    },

    makeAndSendComputerMove: function(games, game_id, io, verbose){
        this.testcount++;
        console.log(this.testcount);
        setTimeout(() => {
            let computerGameActionType = games[game_id].state.expectedNextAction;
            gameMessages.gameActionHandler(games, io, null, verbose)
            ({game_id: game_id, updateType: computerGameActionType, updateData: computerPlayer.makeNextMove(games[game_id])});
            gameMessages.emitGameToPlayers(games, game_id, computerGameActionType, io);
        }, 2000);
    },
}
module.exports = gameMessages;