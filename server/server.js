const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const helmet = require('helmet');

const apiRouter = require("./api/api.router.js");
const game = require("./classes/game.js");
const userModel = require("./models/User");

const MongoStore = require('connect-mongo')(session);

require('dotenv').config();
const verbose = (process.env.VERBOSE === 'true');

const connection = mongoose.createConnection(process.env.RESTREVIEWS_DB_URI);

//The games object defines the state of all active games - need to do more research to determine if 
//there is a better way to store this information.
let games = {};
let connectedUsers = [];
let usersInLobby = [];
let userStatuses = {};

const app = express();
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        connectSrc: ["'self'", "wss://onlineacquire.com"],
    },
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const sessionStore = new MongoStore({
    mongooseConnection: connection,
    collection: 'sessions'
});

const sessionMiddleware = session({
    secret: 'some secret', //TODO: CHANGE THIS
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
});

app.use(sessionMiddleware);


app.use("/api", apiRouter);
app.get("/robots.txt", (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../robots.txt`));
});


function authLogic(req, res, next) {
    //TODO: fix below
    if(req.session.isAuth || req.originalUrl.includes('login') || req.originalUrl === '/img/a_background.webm'|| req.originalUrl === '/img/a_background.mp4'){
         next();
    } else {
        res.status(401);
        res.redirect('/login');
    }
}

function getSendableGame(game, requestingUser){
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
}

app.use(authLogic);

app.use(express.static(path.resolve(`${__dirname}/../client`), {index: 'lobby.html'}));

app.use('/login', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/login.html`));
});
app.use('/lobby', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/lobby.html`));
});
app.use('/about', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/about.html`));
});
app.use('/game', (req, res) => {
    requestedGameID = req.query.gameid;
    res.sendFile(path.resolve(`${__dirname}/../client/index.html`));
});

const server = http.createServer(app);
const io = socketio(server);
let player_id = 0;

io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

io.on('connection', (sock) => {
    /**
     * Some user tracking objects (like userStatuses or sock.request.session.<some_user_tracking_variable>) can be
     * undefined in weird circumstances (Ex: authenticated client hits a game page without ever hitting the lobby page, 
     * or the server restarts, wiping in-memory user-tracking, but maintaining sessions).
     * Because these are hard to predict, I try to mitigate the issue by initializing the problematic objects on first
     * socket connection.
     */
    if(sock.request.session === undefined){
        console.error("session undefined");
        socket.disconnect();
    }
    if(sock.request.session.username === undefined){
        console.error("Client attempted connection with undefined username.");
        console.error(sock.request.session)
        sock.request.session.username = "ERROR_MISSING_USER_NAME";
    }
    if(sock.request.session.isAuth !== true){
        console.error("Unauthenticated client attempted connection.");
        console.error(sock.request.session)
        sock.request.session.destroy();
        socket.disconnect();
        return false;
    }
    if(sock.request.session.lastKnownLocation === undefined){
        sock.request.session.lastKnownLocation = 'unknown';
    }
    if(userStatuses[sock.request.session.username] === undefined){
        userStatuses[sock.request.session.username] = 'unknown';
    }

    connectedUsers.push(sock.request.session.username);
    io.emit('message', `${sock.request.session.username} logged on.`);

    sock.on('disconnect', (reason) => {
        if(sock.request.session.lastKnownLocation.includes('game')){ //User disconnected from a game
            const gameDisconnectedFrom = sock.request.session.lastKnownLocation.split('game')[1];
            io.emit('gameListUpdate', {action: 'playerDisconnected', game: {id: gameDisconnectedFrom}, username: sock.request.session.username});
        }
        else if(sock.request.session.lastKnownLocation === 'lobby'){
            usersInLobby = usersInLobby.filter((user) => user !== sock.request.session.username);
            io.emit('lobbyUpdate', {action: 'remove', users: [sock.request.session.username]});
        }
        sock.request.session.lastKnownLocation = 'disconnected';
        userStatuses[sock.request.session.username] = 'disconnected';
        connectedUsers = connectedUsers.filter((user) => user !== sock.request.session.username);
    });


    sock.on('message', (text) => {
        if(verbose){console.log(`Got message: ${text}`);}
        io.emit('message', `${sock.request.session.username}: ${text}`);
    });

    sock.on('joinLobby', () => {
        sock.emit('lobbyUpdate', {action: 'add', users: usersInLobby});
        usersInLobby.push(sock.request.session.username);
        sock.request.session.lastKnownLocation = 'lobby';
        userStatuses[sock.request.session.username] = 'lobby';
        io.emit('lobbyUpdate', {action: 'add', users: [sock.request.session.username]});
        
    });

    sock.on('gameRequest', gameID => {
        let requestingUser = sock.request.session.username;
        if(gameID === "all"){
            //TODO: add additional game data to summaries
            let gameSummaries = {};
            let usernameDetails = {};
            for (const [key, value] of Object.entries(games)) {
                value.usernames.forEach((username) => {
                    usernameDetails[username] = {'username': username, admin: false};
                    if(userStatuses[username].includes('game')){  //TODO: Could there be cases where userStatuses[username] is undefined?
                        usernameDetails[username]['inGame'] = true;
                    }
                    else {
                        usernameDetails[username]['inGame'] = false;
                    }
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
                const requestedGameCopy = getSendableGame(games[parseInt(gameID, 10)], requestingUser);
                sock.emit('gameResponse', requestedGameCopy);
                sock.data.username = requestingUser;
                sock.request.session.lastKnownLocation = `game${gameID}`;
                userStatuses[sock.request.session.username] = `game${gameID}`;
                io.emit('gameListUpdate', {action: 'addPlayer', game: {id: gameID}, username: sock.request.session.username});
                sock.join(gameID);
            }
        }
        
    });
    sock.on('newGame', ({numPlayers, creator}) => {
        // creator arg no longer used, left in place for demonstration
        const newGameID = game.createGame(games, parseInt(numPlayers, 10), sock.request.session.username);
        let usernameDetails = {};
        usernameDetails[games[newGameID].usernames[0]] = {username: games[newGameID].usernames[0], inGame: false, admin: false};
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
        io.emit('gameListUpdate', updateObject);
         
    });
    sock.on('gameAction', ({game_id, updateType, updateData}) => {
        //if(verbose){console.time('gameAction');}
        if(!Object.keys(games).includes(game_id.toString())){
            if(verbose){console.log("Requested a game that does not exist!");}
            sock.emit('error', "none"); //TODO: add catch-all error listener to client.
            return false;
        }
        if(verbose){console.log(`Game update: game: ${game_id}, updateType: ${updateType}, updateData: ${JSON.stringify(updateData)}`);}
        let updateResult;
        try{
            updateResult = game.updateGame(games[game_id], sock.request.session.username, updateType, updateData, {admin: false, verbose: verbose});
        } 
        catch(err){
            console.error(err);
        }
        if(updateResult !== "success"){
            /**
             * Game did not successfully update upon an action attempted by this player. Game state on server *should*
             * be unchanged. No other players are notified of the action or it's error status. The server sends
             * a message to reset the acting player's UI components to their state prior to the unaccepted action.
             */
            if(verbose){console.log(`Failed to update game because: ${updateResult}.`);}
            sock.emit('gameUpdate', {type: updateType, game: getSendableGame(games[game_id], sock.request.session.username), error: updateResult});
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
        else{
            io.in(game_id.toString()).fetchSockets()
            .then((sockets) => {
                sockets.forEach((playerSocket) => {
                    playerSocket.emit('gameUpdate', {type: updateType, game: getSendableGame(games[game_id], playerSocket.data.username)});
                });
            });
        }
        //if(verbose){console.timeEnd('gameAction');}
    });
});

server.on('error', (err) => {
    console.error(err);
});

server.listen(8080, () => {
    if(verbose){console.log('server started');}
});


//Create and edit some placeholder games for testing
//TODO: updateGame unit tests
if(verbose){

    let updateID = 2;
    game.createGame(games, 4, 4);
    userStatuses['4'] = 'game1';
    game.createGame(games, 6, 'tate');
    userStatuses['tate'] = 'game2';
    console.log(game.updateGame(games[updateID], 7654, "joinGame", {}));
    userStatuses['7654'] = 'game2';
    console.log(game.updateGame(games[updateID], 7653, "joinGame", {}));
    userStatuses['7653'] = 'game2';
    console.log(game.updateGame(games[updateID], 7652, "joinGame", {}));
    userStatuses['7652'] = 'game2';

    console.log(games[updateID].usernames);
    //console.log(game.updateGame(games[updateID], 7655, "startGame", {}));
    console.log(game.updateGame(games[updateID], 'tate', "playTile", {x:0, y:0}, {admin: true, verbose: true}));
    console.log(game.updateGame(games[updateID], 'tate', "purchaseShares", {endGame: false, purchase: {}}));
    console.log(game.updateGame(games[updateID], 7654, "playTile", {x:4, y:2}, {admin: true, verbose: true}));
    console.log(game.updateGame(games[updateID], 7654, "purchaseShares", {endGame: false, purchase: {}}));
    console.log(games[updateID].state.player_states[0]);
    console.log(games[updateID].state.player_states[1]);
    console.log(games[updateID].state.player_states[2]);
    console.log(games[updateID].state.player_states[3]);
    console.log(games[updateID].state.bank_shares);
}
