"use strict";

const internalGameFunctions = require("./internalGameFunctions.js");
const Timer = require("./timers.js");
const computerPlayer = require("./computerPlayer.js");
const GameModel = require("../models/Game.js");
const rankPlayers = require("./rankPlayers.js");
const mongoose = require('mongoose');
require('dotenv').config();
const connection = mongoose.connect(process.env.RESTREVIEWS_DB_URI)
.catch(e=>console.error(e));

const gameMessages = {
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
        sock.on('gameHistoryRequest', this.gameHistoryRequestHandler(games, io, sock));
        /*
        sock.on('joinLobby', this.joinLobbyHandler());
        sock.on('gameRequest', this.gameRequestHandler());
        sock.on('newGame', this.newGameHandler());
        */

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
                for (const [key, value] of Object.entries(games)) {
                    let usernameDetails = {};
                    value.usernames.forEach((username) => {
                        usernameDetails[username] = {'username': username, location: userStatuses[username], admin: false};
                    });
                    gameSummaries[key] = {
                        usernames: value.usernames, 
                        watchers: value.watchers,
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
                    const requestedGame = games[parseInt(gameID, 10)];
                    let watcher = false;
                    requestedGame.num_connected_players++;
                    if(!requestedGame.usernames.includes(requestingUser)){
                        requestedGame.watchers.push(requestingUser);
                        watcher = true;
                    }
                    // Unset inactive_since
                    requestedGame.inactive_since = new Date(8640000000000000).getTime();
                    
                    // Get details on players
                    let usernameDetails = {};
                    requestedGame.usernames.forEach((username) => {
                        usernameDetails[username] = {'username': username, location: userStatuses[username], admin: false};
                    });
                    
                    const requestedGameCopy = this.getSendableGame(requestedGame, requestingUser);
                    sock.emit('gameResponse', {game: requestedGameCopy, playerDetails: usernameDetails});
                    sock.data.username = requestingUser;
                    sock.request.session.lastKnownLocation = `game${gameID}`;
                    userStatuses[sock.request.session.username] = `game${gameID}`;
                    io.in('lobby').in(gameID).emit('gameListUpdate', {
                        action: 'addPlayer', 
                        game: {
                            id: gameID,
                            usernames: requestedGame.usernames,
                            max_players: requestedGame.max_players
                        },
                        username: sock.request.session.username,
                        watcher: watcher,
                        admin: false
                    });
                    sock.join(gameID); //typeOf(gameID) = string
                }
            }
            
        });
        sock.on('newGame', ({numPlayers, timePerPlayer}) => {
            const newGameID = internalGameFunctions.createGame(games, parseInt(numPlayers, 10), timePerPlayer, sock.request.session.username);
            let usernameDetails = {};
            usernameDetails[games[newGameID].usernames[0]] = {username: games[newGameID].usernames[0], location: userStatuses[games[newGameID].usernames[0]], admin: false};
            const gameSummary = {
                id: newGameID,
                usernames: games[newGameID].usernames,
                watchers: games[newGameID].watchers,
                playerDetails: usernameDetails,
                max_players: games[newGameID].max_players,
                game_started: games[newGameID].state.game_started,
                game_ended: games[newGameID].state.game_ended
            };
            const updateObject = {
                "action": "addGame",
                "game": gameSummary
            }
            sock.emit('forceRedirect', newGameID);
            io.in('lobby').emit('gameListUpdate', updateObject);
             
        });
    },

    //---------------Game Message Handlers-----------------------------

    gameHistoryRequestHandler: (games, io, sock) => async (gameID) => {
        let matchingGames = await GameModel.find({ usernames: sock.request.session.username }); // put this in stats, then we'll query based on id here.
    },

    gameActionHandler: (games, io, sock, verbose) => ({game_id, updateType, updateData}) => {
        // io and sock will be null if game action was generated by computerPlayer.
        if(verbose){console.time('gameAction');}
        if(!Object.keys(games).includes(game_id.toString())){
            if(verbose){console.log("Requested a game that does not exist!");}
            //sock.emit('error', "none"); //TODO: add catch-all error listener to client.
            return false;
        }
        if(verbose){console.log(`Game update: game: ${game_id}, updateType: ${updateType}, updateData: ${JSON.stringify(updateData)}`);}
        let updateResult;
        try{
            if(sock === null){ // move made by computer
                updateResult = internalGameFunctions.callUpdateGameWithExpectedArgs(games[game_id], updateData, {admin: false, computer: true, verbose: verbose});
            }
            else{
                updateResult = internalGameFunctions.updateGame(games[game_id], sock.request.session.username, updateType, updateData, {admin: false, computer: false, verbose: verbose});
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
                game: games[game_id],
                // Not sure if we need to send player data or not,
                // is there any case where we could not infer all the data on the client-side?
            };
            io.in(game_id.toString()).emit('gameUpdate', gameUpdate);
        }
        else if(updateType === 'startGame'){
            // Set Timers on players. Logically I feel like this should happen in updateGame, but I want to keep IO out of internalGameFunctions.
            // Addtional timer control happens in interalGameFunctions.endTurn().
            for(let i=0; i<games[game_id].num_players; i++){
                //Total play timer
                let test_time_lim = games[game_id].time_per_player + 200; // Extra 200 ms to offset time lost at start.
                /*
                // fast timeouts for debugging
                if(games[game_id].usernames[i] !== games[game_id].creator){
                    test_time_lim = 5000;
                }
                */
                games[game_id].state.player_states[i].timerTotal = new Timer(() => {
                    games[game_id].state.player_states[i].out_of_total_time = true;
                    games[game_id].players_timed_out.push(games[game_id].usernames[i]);
                    //games[game_id].state.player_states[i].timerAction.reset(); // so the action timer doesn't expire while we are already waiting on a computer move.
                    gameMessages.makeAndSendComputerMove(games, game_id, io, verbose);
                }, test_time_lim);
                //Action timer
                /*
                games[game_id].state.player_states[i].timerAction = new Timer(() => {
                    games[game_id].state.player_states[i].out_of_action_time = true;
                    if(!(games[game_id].state.player_states[i].timerTotal.getRemaining() < 3000)){
                        // If player has < 3 seconds of total time, we wait for the timerTotal timeout instead.
                        // This prevents double moves by the computer.
                        gameMessages.makeAndSendComputerMove(games, game_id, io, verbose);
                    }
                }, games[game_id].time_per_player * 0.15);
                */
                //pause timers for all but the first player.
                if(i !== 0){
                    games[game_id].state.player_states[i].timerTotal.pause();
                    //games[game_id].state.player_states[i].timerAction.pause();
                }
            }
            gameMessages.emitGameToPlayers(games, game_id, updateType, io);
            io.in('lobby').emit('gameListUpdate', {action: "gameStarted", game: {id: game_id}});
        }
        else{
            if(games[game_id].state.player_states[games[game_id].state.turn].out_of_total_time ||
                games[game_id].state.player_states[games[game_id].state.turn].out_of_action_time){
                    if(!games[game_id].state.game_ended){
                        gameMessages.makeAndSendComputerMove(games, game_id, io, verbose);
                    }
            }
            if(sock !== null){ // move made by user client (not computer player)
                gameMessages.emitGameToPlayers(games, game_id, updateType, io);
            }
            gameMessages.updateHistory(games[game_id], updateType, updateData);
        }
        if(verbose){console.timeEnd('gameAction');}
        if(games[game_id].state.game_ended){
            //clean up game
            io.in('lobby').emit('gameListUpdate', {action: "gameEnded", game: {id: game_id}});
            if(games[game_id].num_players > 1){ // db and trueskill functions not set up to handle single player games
                rankPlayers.postGameAdjust(games[game_id]); //updates player skill level and record in db
                gameMessages.saveGameToDatabase(games[game_id]);
            }
        }
    },

    // --------------Game Message helper functions --------------------
    updateHistory: function(game, updateType, updateData){
        let remainingTimes = [];
        for(let i=0; i<game.num_players; i++){
            if(game.state.player_states[i].timerTotal){
                remainingTimes.push(game.state.player_states[i].timerTotal.getRemaining());
            }
        }
        game.history.push([updateType, updateData, remainingTimes]);
    },

    getSendableGame: function(game, requestingUser){
        //We send a modified copy of the game object to the client, after removing secret data and updating time limits.
        let requestedGameCopy = JSON.parse(JSON.stringify(game, (key, value) => {
            if(['timerTotal', 'timerAction', 'history'].includes(key)){ //Can't stringify circular references in timers.
                return undefined;
            }
            return value;
        })); 
        const requestingUsersPlayerID = requestedGameCopy.usernames.indexOf(requestingUser);
        for(let i=0; i<requestedGameCopy.num_players; i++){
            //get remaining times
            
            if(!game.state.player_states[i].timerTotal){
                requestedGameCopy.state.player_states[i].total_time_remaining = null;
                //requestedGameCopy.state.player_states[i].action_time_remaining = null;
            }
            else{
                requestedGameCopy.state.player_states[i].total_time_remaining = game.state.player_states[i].timerTotal.getRemaining();
                //requestedGameCopy.state.player_states[i].action_time_remaining = game.state.player_states[i].timerAction.getRemaining();
            }
            
            if(i === requestingUsersPlayerID){
                continue;
            }
            requestedGameCopy.state.player_states[i].tiles = [];
        }
        requestedGameCopy.state.tile_bank = [];
        requestedGameCopy.original_tile_bank = [];
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
        setTimeout(() => {
            if(games[game_id]){ //if game exists (if game has not be deleted due to inactivity)
                let computerGameActionType = games[game_id].state.expectedNextAction;
                gameMessages.gameActionHandler(games, io, null, verbose)
                ({game_id: game_id, updateType: computerGameActionType, updateData: computerPlayer.makeNextMove(games[game_id])});
                gameMessages.emitGameToPlayers(games, game_id, computerGameActionType, io);
            }
        }, 1000);
    },

    saveGameToDatabase: async function(game){
        let completedGame = new GameModel({
            time_per_player: game.time_per_player,
            usernames: game.usernames_ranked,
            networths: game.final_net_worths,
            players_timed_out: game.players_timed_out,
            usernames_original_order: game.usernames_original_order,
            tile_bank: game.original_tile_bank,
            history: game.history
        });
        await completedGame.save()
        .catch(err => console.error(err));
    }
}
module.exports = gameMessages;