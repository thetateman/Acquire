"use strict";

const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const helmet = require('helmet');
const fs = require("fs");

const apiRouter = require("./api/api.router.js");
const internalGameFunctions = require("./js/internalGameFunctions.js");
const chatMessages = require("./js/chatMessages.js");
const gameMessages = require("./js/gameMessages.js");
const gameManager = require("./js/gameManager.js");
const computerPlayer = require("./js/computerPlayer");
const rankPlayers = require("./js/rankPlayers.js");
const Timer = require("./js/timers.js");
const userModel = require("./models/User");
const HeuristicAgent = require("./js/HeuristicAgent");
const RandomPlacerHeuristicAgent = require("./js/RandomPlacerHeuristicAgent");
const NNPlacerHeuristicAgent = require("./js/NNPlacerHeuristicAgent");
const aiHelpers = require("./js/aiHelpers");
const tfjs = require('@tensorflow/tfjs');
const tfjs_node = require('@tensorflow/tfjs-node');

const model = tfjs_node.loadLayersModel(`file://../model_1/model.json`);


const MongoStore = require('connect-mongo')(session);

require('dotenv').config();
const verbose = (process.env.VERBOSE === 'true');

const connection = mongoose.createConnection(process.env.RESTREVIEWS_DB_URI);

//The games object defines the state of all active games.

// Restore active games from backup
//let games = gameManager.restoreGamesObject(); 
/* NOTE: resetting the timers gets complicated when restoring games from backup,
restoring games probably isn't worth the trouble. */

let games = {};

let guestID = 0;
let connectedUsers = [];
let usersInLobby = [];
let userStatuses = {};

const app = express();

// Security middleware
app.set('trust proxy', 'loopback');

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
    secret: process.env.SECRET, //TODO: CHANGE THIS
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 90
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
        req.session.username = 'Guest' + guestID;
        guestID++;
        req.session.isAuth = true;
        //res.status(401);
        //res.redirect('/login');
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
    let requestedGameID = req.query.gameid;
    res.sendFile(path.resolve(`${__dirname}/../client/index.html`));
});
app.use('/stats', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/stats.html`));
});
app.use('/sitemap', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/sitemap.xml`));
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
        console.error(`${Date()} Session undefined`);
        sock.disconnect();
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

    if(!connectedUsers.includes(sock.request.session.username)){
        //welcome message
        io.in('lobby').emit('message', {
            sender: 'SERVER',
            origin: 'lobby',
            mentions: [],
            message_content: `${sock.request.session.username} connected.`});
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
        if(sock.request.session.lastKnownLocation.includes('game')){ //User disconnected from a game
            const gameDisconnectedFrom = sock.request.session.lastKnownLocation.split('game')[1];
            if(games[gameDisconnectedFrom].watchers.includes(sock.request.session.username)){
                games[gameDisconnectedFrom].watchers = games[gameDisconnectedFrom].watchers.filter((watcher) => watcher !== sock.request.session.username);
                io.in('lobby').in(gameDisconnectedFrom).emit('gameListUpdate', {action: 'removePlayer', game: {id: gameDisconnectedFrom}, username: sock.request.session.username});
            }
            else{
                io.in('lobby').in(gameDisconnectedFrom).emit('gameListUpdate', {action: 'playerDisconnected', game: {id: gameDisconnectedFrom}, username: sock.request.session.username});
            }
            games[gameDisconnectedFrom].num_connected_players--;
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
                    io.in('lobby').emit('message', {
                        sender: 'SERVER',
                        origin: 'lobby',
                        mentions: [],
                        message_content: `${sock.request.session.username} disconnected.`});
                }
            }, 1000);
        }, 1000);
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
    // internalGameFunctions.createGame(games, 4, 1000 * 60 * 1, '4');
    // userStatuses['4'] = 'game1';

    // let updateID = internalGameFunctions.createGame(games, 6, 1000 * 60 * 1, 'HeuristicAgent');
    // userStatuses['HeuristicAgent'] = 'game2';
    // console.log(internalGameFunctions.updateGame(games[updateID], "RandomPlacerHeuristicAgent", "joinGame", {}));
    // userStatuses['RandomPlacerHeuristicAgent'] = 'game2';
    // console.log(internalGameFunctions.updateGame(games[updateID], 7653, "joinGame", {}));
    // userStatuses['7653'] = 'game2';
    // console.log(internalGameFunctions.updateGame(games[updateID], 7652, "joinGame", {}));
    // userStatuses['7652'] = 'game2';

    //console.log(games[updateID].usernames);

    //console.log(internalGameFunctions.updateGame(games[updateID], 'HeuristicAgent', "startGame", {}));
    let myRandomAgent;
    let myHeuristicAgent;
    let myNNAgent;
    let myNNAgent2;
    async function initAgents(){
        myRandomAgent = new RandomPlacerHeuristicAgent();
        myHeuristicAgent = new HeuristicAgent();
        myNNAgent = new NNPlacerHeuristicAgent();
        await myNNAgent.init(1);
        myNNAgent2 = new NNPlacerHeuristicAgent();
        await myNNAgent2.init(2);
    }
    async function runSelfPlayGames(games, numGames){
        
        let autoGameIds = [];
        console.time("create-auto-games");
        let aiPlayers = ["NeuralAgent", "RandomAgent"]; 
        //"RandomPlayerHeuristicAgent2", "HeuristicAgent"];
        for(let createGameIndex = 0; createGameIndex < numGames; createGameIndex++){
            let updateID = internalGameFunctions.createGame(games, 6, 1000 * 60 * 1, aiPlayers[0]);
            for(let i = 1; i < aiPlayers.length; i++){
                internalGameFunctions.updateGame(games[updateID], aiPlayers[i], "joinGame", {});
            }
            internalGameFunctions.updateGame(games[updateID], aiPlayers[0], "startGame", {});
            autoGameIds.push(updateID);
        }
        console.timeEnd("create-auto-games");
        console.time("auto-games");
        let writer = fs.createWriteStream('../training_output/state_history1.csv', {start: 0});
        for(let gameIndex = 0; gameIndex < numGames; gameIndex++) {
            let updateID = autoGameIds[gameIndex]     
            let movingAgent;
            let stateHistory = [];
            for(let i = 0; i<500; i++){
                switch(games[updateID].usernames[games[updateID].state.turn].charAt(0)){
                    case 'H':
                        movingAgent = myHeuristicAgent;
                        break;
                    case 'R':
                        movingAgent = myRandomAgent;
                        break;
                    case 'N':
                        movingAgent = myNNAgent;
                        break;
                    case '2':
                        movingAgent = myNNAgent2;
                        break;
                    default:
                        console.error("That agent is not defined.");
                        break;
                };
                if(games[updateID].state.game_ended) break;

                let nextMove = await movingAgent.makeNextMove(games[updateID]);
                internalGameFunctions.updateGame(games[updateID], games[updateID].usernames[games[updateID].state.turn], games[updateID].state.expectedNextAction, nextMove, {admin: false, verbose: false});
                if(i>60) stateHistory.push(aiHelpers.stateToVector(games[updateID].state));
                //console.log(`finished ply ${i}`);
                


                //computerPlayer.makeNextMove(games[updateID]);
                // if(games[updateID].state.game_ended) break;
                // console.log(internalGameFunctions.updateGame(games[updateID], games[updateID].usernames[games[updateID].state.turn], games[updateID].state.expectedNextAction, computerPlayer.makeNextMove(games[updateID]), {admin: false, verbose: true}));
        
            }
            // label states in state history

            let numPlayers = games[updateID].usernames.length;
            let ranks = [];
            for(let user = 0; user < numPlayers; user++){
                let place;
                for(place = 0; place < numPlayers; place++){
                    if(games[updateID].places[place].includes(games[updateID].usernames[user])) break;
                }
                
                ranks.push(place + 1);
            }
            let labels = [];
            ranks.forEach(rank => {
                let label = (numPlayers - rank) / (numPlayers - 1);
                labels.push(label);
            });
            stateHistory.forEach(state => {
                // label: 0.0 = last place | 1.0 = first place
                // TODO handle ties
                
                state = state.concat(labels);
                // model.then(result => result.predict(tfjs.tensor([state.slice(0, -1)]))).then(prediction => (prediction.array().then(array => console.log(array))));
                writer.write(state.toString() + '\n');
            });
            
        }
        console.timeEnd("auto-games");
        //set user statuses so lobby page doesn't break
        aiPlayers.forEach(player => {
            userStatuses[player] = `game${numGames - 1}`;
        });
        
        let placeCounts = {};
        for(let i = 0; i < aiPlayers.length; i++){
            placeCounts[aiPlayers[i]] = new Array(aiPlayers.length).fill(0);
        }

        Object.values(games).forEach((game) => {
            if(game.hasOwnProperty("places")){
                for(let i = 0; i < aiPlayers.length; i++){
                    for(let j = 0; j < aiPlayers.length; j++){
                        if(game.places[i].includes(aiPlayers[j])){
                            placeCounts[aiPlayers[j]][i]++;
                        }
                    }
                }
            } 
        });
        for(let i = 0; i < aiPlayers.length; i++){
            console.log(`${aiPlayers[i]} record: \n${placeCounts[aiPlayers[i]]}\n`);
        }
    }
    initAgents().then(() => {
        runSelfPlayGames(games, 3).then(() => {
        
        })
    })

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

