const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');

const apiRouter = require("./api/api.router.js");
const game = require("./classes/game.js");
const userModel = require("./models/User");

const MongoStore = require('connect-mongo')(session);

require('dotenv').config();

const connection = mongoose.createConnection(process.env.RESTREVIEWS_DB_URI);

//The games object defines the state of all active games - need to do more research to determine if 
//there is a better way to store this information.
let games = {};

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const sessionStore = new MongoStore({
    mongooseConnection: connection,
    collection: 'sessions'
});

const sessionMiddleware = session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
});

app.use(sessionMiddleware);


app.use("/api", apiRouter);


function authLogic(req, res, next) {
    console.log(req.sessionID);
    console.log(req.originalUrl);
    //TODO: fix below
    if(req.session.isAuth || req.originalUrl.includes('login') || req.originalUrl === '/img/a_background.jpg'){
         next();
    } else {
        res.status(401);
        res.redirect('/login');
    }
}

app.use(authLogic, express.static(`${__dirname}/../client`));

app.use('/login', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/login.html`));
});
app.use('/lobby', (req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../client/lobby.html`));
});
app.use('/game', (req, res) => {
    requestedGameID = req.query.gameid;
    console.log(requestedGameID);
    res.sendFile(path.resolve(`${__dirname}/../client/index.html`));
});



const server = http.createServer(app);
const io = socketio(server);
let player_id = 0;

io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

io.on('connection', (sock) => {
   
    current_player_id = player_id;
    player_id++;
    colors = ["red", "orange", "yellow", "green", "blue", "purple", "black"]
    color = colors[current_player_id % colors.length];
    sock.emit('message', 'You are connected');
    //console.log(sock.request.session);

    sock.on('message', (text) => {
        io.emit('message', text);
        console.log(`got the message: ${text}.`);
    });
    sock.on('turn', ({x, y}) => {
        io.emit('turn', {x, y, color});
        console.log(JSON.stringify({x, y}));
    });
    sock.on('gameRequest', gameID => {
        if(gameID === "all"){
            sock.emit('gameResponse', games);
        }else{
            requestedGame = games[parseInt(gameID, 10)];
            if(requestedGame){
                sock.emit('gameResponse', requestedGame);
            } else {
                console.log("Requested a game that does not exist!");
                sock.emit('gameResponse', "none");
            }
        }
        
    });
    sock.on('newGame', ({numPlayers, creator}) => {
        // creator arg no longer used, left in place for demonstration
        const newGameID = game.createGame(games, parseInt(numPlayers, 10), sock.request.session.username);
        updateObject = {
            "action": "addGame",
            "game": games[newGameID],
        }
        io.emit('gameListUpdate', updateObject);
         
    });
    sock.on('gameAction', ({game, userID, updateType, updateData}) => {
        const updateResult = game.updateGame(game, userID, updateType, updateData);
    });
});

server.on('error', (err) => {
    console.error(err);
});

server.listen(8080, () => {
    console.log('server is ready.');
});


//Create and edit some placeholder games for testing
let updateID = 1;
game.createGame(games, 4);
game.createGame(games, 5);
console.log(game.updateGame(games[updateID], 4, "playTile", {x:5, y:2}));
game.updateGame(games[updateID], 4, "purchaseShares", {x:0, y:0});
console.log(game.updateGame(games[updateID], 4, "playTile", {x:0, y:0}));
console.log(game.updateGame(games[updateID], 4, "playTile", {x:5, y:3}));
console.log(game.updateGame(games[updateID], 4, "playTile", {x:5, y:4}));



console.log(Object.entries(games));
console.log(games[1].state.chains);
console.log(games[1].state.board);