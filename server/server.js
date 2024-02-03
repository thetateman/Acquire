"use strict";

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const helmet = require('helmet');

const apiRouter = require("./api/api.router.js");
const internalGameFunctions = require("./js/internalGameFunctions.js");
const chatMessages = require("./js/chatMessages.js");
const gameMessages = require("./js/gameMessages.js");
const gameManager = require("./js/gameManager.js");
const computerPlayer = require("./js/computerPlayer");
const rankPlayers = require("./js/rankPlayers.js");
const Timer = require("./js/timers.js");
const UserModel = require("./models/User");

const MongoStore = require('connect-mongo')(session);

require('dotenv').config();
const verbose = (process.env.VERBOSE === 'true');

const connection = mongoose.createConnection(process.env.RESTREVIEWS_DB_URI);

//The games object defines the state of all active games.

// Restore active games from backup
//let games = gameManager.restoreGamesObject(); 
/* NOTE: resetting the timers gets complicated when restoring games from backup,
restoring games probably isn't worth the trouble. */

const serverStartTime = new Date();

let games = {};

let guestID = 0;
let connectedUsers = [];
let usersInLobby = [];
let userStatuses = {};
let io;

const app = express();

// Security middleware
app.set('trust proxy', 'loopback');

// app.use(helmet({strictTransportSecurity: false}));
// app.use(helmet.contentSecurityPolicy({
//     directives: {
//         connectSrc: ["'self'", "wss://onlineacquire.com", "192.168.1.129"],
//     },
// }));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const sessionStore = new MongoStore({
    mongooseConnection: connection,
    collection: 'sessions'
});

const sessionMiddleware = session({
    secret: process.env.SECRET, //TODO: CHANGE THIS
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 90
    }
});

app.use(sessionMiddleware);

let bannedUsers = {};
let bannedIPs = [];
let lastUserIPs = {};
try{
    bannedUsers = JSON.parse(fs.readFileSync('../server_data_backup/banned_users.json', 'utf8'));
    Object.values(bannedUsers).forEach((user) => {
        user.ips.forEach((ip) => bannedIPs.push(ip));
    });
}
catch(err){
    console.error(`${Date()} Could not restore banned users: `, err);
    bannedUsers = {};
    bannedIPs = [];
}




app.use('/banapi', (req, res) => {
    if(req.body.ban_unban === 'ban'){
        bannedUsers[req.body.username] = {
            ips: [lastUserIPs[req.body.username] ?? "a-string-that-will-never-match-anyones-ip"],
            reason: req.body.reason
        }
        fs.writeFile('../server_data_backup/banned_users.json', JSON.stringify(bannedUsers), err => {
            if (err) {
              console.error(err);
            }
            // file written successfully
          });
        bannedIPs.push(lastUserIPs[req.body.username] ?? "a-string-that-will-never-match-anyones-ip");

        io.fetchSockets()
        .then((sockets) => {
            sockets.forEach((playerSocket) => {
                if(req.body.username === playerSocket.request.session.username){
                    playerSocket.disconnect();
                }
            });
        });
        
    }
    else {
        if(bannedUsers[req.body.username] !== undefined){
            bannedIPs = bannedIPs.filter((ip) => !bannedUsers[req.body.username].ips.includes(ip));
            delete bannedUsers[req.body.username];
            fs.writeFile('../server_data_backup/banned_users.json', JSON.stringify(bannedUsers), err => {
                if (err) {
                console.error(err);
                }
                // file written successfully
            });
        }
        
    }
    res.send(`<h1>Successfully ${req.body.ban_unban === 'ban' ? "banned" : "unbanned"} ${req.body.username}</h1><a href="/">Lobby</a>`);
})


app.use("/api", apiRouter);
app.get("/robots.txt", (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../robots.txt`));
});




function authLogic(req, res, next) {
    //TODO: fix below
    req.session.ip= req.ip; 
    if((Object.keys(bannedUsers).includes(req.session.username) || bannedIPs.includes(req.session.ip)) && req.originalUrl !== '/banned.html'){
        // sock.request.session.destroy();
        // sock.disconnect();
        res.redirect('/banned.html');
        return false;
    }
    if(req.session.username !== 'thetateman' && (req.originalUrl.includes('admin') || req.originalUrl.includes('banapi'))){
        res.status(401);
        res.redirect('/');
        return false;
    }
    if(req.session.isAuth || req.originalUrl.includes('login') || req.originalUrl === '/img/a_background.webm'|| req.originalUrl === '/img/a_background.mp4'){
         next();
    } else {
        req.session.username = 'Guest' + guestID + '-' + serverStartTime.getMinutes();
        guestID++;
        req.session.isAuth = true;
        //res.status(401);
        //res.redirect('/login');
        next();
    }
}

function websocketAuthLogic(socket, next) {
    if(Object.keys(bannedUsers).includes(socket.request.session.username)){
        return false;
    }
    else{
        next();
    }
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
    req.session.current_game = req.query.gameid;
    res.sendFile(path.resolve(`${__dirname}/../client/index.html`));
});
app.use('/stats', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/stats.html`));
});
app.use('/history', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/history.html`));
});
app.use('/sitemap', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/sitemap.xml`));
});

const server = http.createServer(app);
io = socketio(server);
let player_id = 0;

io.use(function(socket, next) {
    sessionMiddleware(socket.request, {}, next);
});
io.use(websocketAuthLogic);


io.on('connection', (sock) => {
    /**
     * Some user tracking objects (like userStatuses or sock.request.session.<some_user_tracking_variable>) can be
     * undefined in weird circumstances (Ex: authenticated client hits a game page without ever hitting the lobby page, 
     * or the server restarts, wiping in-memory user-tracking, but maintaining sessions).
     * Because these are hard to predict, I try to mitigate the issue by initializing the problematic objects on first
     * socket connection.
     */
    if(sock.request.session === undefined){
        console.error(`${Date()} Session undefined`);
        sock.disconnect();
        return false;
    }
    if(sock.request.session.username === undefined){
        console.error(`${Date()} Client attempted connection with undefined username.`);
        console.error(sock.request.session)
        sock.request.session.username = "ERROR_MISSING_USER_NAME";
    }
    if(sock.request.session.isAuth !== true){
        console.error(`${Date()} Unauthenticated client attempted connection.`);
        console.error(sock.request.session)
        sock.request.session.destroy();
        sock.disconnect();
        return false;
    }
    if(sock.request.session.lastKnownLocation === undefined){
        sock.request.session.lastKnownLocation = 'unknown';
    }
    if(userStatuses[sock.request.session.username] === undefined){
        userStatuses[sock.request.session.username] = 'unknown';
    }

    if(sock.request.session.current_game){
        sock.join(sock.request.session.current_game);
    }

    if(!connectedUsers.includes(sock.request.session.username)){
        //welcome message
        io.emit('message', {
            sender: 'SERVER',
            origin: 'lobby',
            target: 'lobby',
            mentions: [],
            message_content: `${sock.request.session.username} connected.`});

        //save new ip addresses to database
        UserModel.updateOne({username: sock.request.session.username}, {
            $addToSet: {
                associated_ip_addresses: sock.request.session.ip, 
            }
        }, function(updateErr, updateDocs){
            if(updateErr){
                console.error(updateErr);
            }
        });
        lastUserIPs[sock.request.session.username] = sock.request.session.ip;
        // let logEntry = `${sock.request.connection.remoteAddress} ${sock.request.session.username} -> (${target}): ${text}\n`;
        //     fs.writeFile('../server_data_backup/chatlog.txt', logEntry, { flag: 'a' }, err => {
        //         if (err) {
        //           console.error(err);
        //         }
        //         // file written successfully
        //     });

    }
    connectedUsers.push(sock.request.session.username);

    // Event listeners
    // Misc
    sock.on('usernameRequest', () => {
        sock.emit('usernameResponse', sock.request.session.username);
    });
    // Chat
    chatMessages.registerChatMessageHandlers(games, io, sock);
    // Game actions
    gameMessages.registerGameMessageHandlers(games, io, sock, userStatuses, usersInLobby, verbose);

    sock.on('disconnect', (reason) => {
        try{
            if(sock.request.session.lastKnownLocation.includes('game')){ //User disconnected from a game
                const gameDisconnectedFrom = sock.request.session.lastKnownLocation.split('game')[1];
                if(games[gameDisconnectedFrom] !== undefined){
                    if(games[gameDisconnectedFrom].watchers.includes(sock.request.session.username)){
                        games[gameDisconnectedFrom].watchers = games[gameDisconnectedFrom].watchers.filter((watcher) => watcher !== sock.request.session.username);
                        io.in('lobby').in(gameDisconnectedFrom).emit('gameListUpdate', {action: 'removePlayer', game: {id: gameDisconnectedFrom}, username: sock.request.session.username});
                    }
                    else{
                        io.in('lobby').in(gameDisconnectedFrom).emit('gameListUpdate', {action: 'playerDisconnected', game: {id: gameDisconnectedFrom}, username: sock.request.session.username});
                    }
                    games[gameDisconnectedFrom].num_connected_players--;
                }
                // Leave the room for the game
                // Actually this happens anyway on redirect
                //sock.leave(gameDisconnectedFrom);
            }
            else if(sock.request.session.lastKnownLocation === 'lobby'){
                usersInLobby = usersInLobby.filter((user) => user !== sock.request.session.username);
                io.in('lobby').emit('lobbyUpdate', {action: 'remove', users: [sock.request.session.username]});
            }
            sock.request.session.lastKnownLocation = 'disconnected';
            userStatuses[sock.request.session.username] = 'disconnected';
            setTimeout(() => {
                const usernameIndex = connectedUsers.indexOf(sock.request.session.username);
                if (usernameIndex > -1){
                    connectedUsers.splice(usernameIndex, 1);
                }
                setTimeout(() => {
                    if(!connectedUsers.includes(sock.request.session.username)){
                        //user disconnected from the site
                        io.emit('message', {
                            sender: 'SERVER',
                            origin: 'lobby',
                            target: 'lobby',
                            mentions: [],
                            message_content: `${sock.request.session.username} disconnected.`});
                    }
                }, 1000);
            }, 1000);
        } catch(err){
            console.error(err);
        }
    });
});

const gamesCleanerIntervalTimeout = setInterval(gameManager.cleanGames, 1000 * 60 * 1, games, io);
// See note above on restoring games from backup.
//const gamesBackupIntervalTimeout = setInterval(gameManager.backupGamesObject, 1000 * 60 * 1, games);


server.on('error', (err) => {
    console.error(err);
});

server.listen(8080, () => {
    if(verbose){console.log('server started');}
});

//Create and edit some placeholder games for testing
//TODO: updateGame unit tests
if(verbose){
    internalGameFunctions.createGame(games, 4, 1000 * 60 * 1, '4');
    userStatuses['4'] = 'game1';
    let updateID = internalGameFunctions.createGame(games, 6, 1000 * 60 * 1, 'tate');
    userStatuses['tate'] = 'game2';
    console.log(internalGameFunctions.updateGame(games[updateID], 7654, "joinGame", {}));
    userStatuses['7654'] = 'game2';
    console.log(internalGameFunctions.updateGame(games[updateID], 7653, "joinGame", {}));
    userStatuses['7653'] = 'game2';
    console.log(internalGameFunctions.updateGame(games[updateID], 7652, "joinGame", {}));
    userStatuses['7652'] = 'game2';

    console.log(games[updateID].usernames);
    
    console.log(internalGameFunctions.updateGame(games[updateID], 'tate', "startGame", {}));

    /*
    console.log(internalGameFunctions.updateGame(games[updateID], 7655, "startGame", {}));
    console.log(internalGameFunctions.updateGame(games[updateID], 'tate', "playTile", {x:0, y:0}, {admin: true, verbose: true}));
    console.log(internalGameFunctions.updateGame(games[updateID], 'tate', "purchaseShares", {endGame: false, purchase: {}}));
    console.log(internalGameFunctions.updateGame(games[updateID], 7654, "playTile", {x:4, y:2}, {admin: true, verbose: true}));
    console.log(internalGameFunctions.updateGame(games[updateID], 7654, "purchaseShares", {endGame: false, purchase: {}}));
    console.log(games[updateID].state.player_states[0]);
    console.log(games[updateID].state.player_states[1]);
    console.log(games[updateID].state.player_states[2]);
    console.log(games[updateID].state.player_states[3]);
    console.log(games[updateID].state.bank_shares);
    */
    

}

