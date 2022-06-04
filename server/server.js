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

const app = express();
app.use(helmet());

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


function authLogic(req, res, next) {
    //TODO: fix below
    if(req.session.isAuth || req.originalUrl.includes('login') || req.originalUrl === '/img/a_background.gif'){
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

app.use(authLogic, express.static(`${__dirname}/../client`));

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
    sock.emit('message', 'You are connected');

    sock.on('message', (text) => {
        if(verbose){console.log(`Got message: ${text}`);}
        io.emit('message', text);
    });

    sock.on('gameRequest', gameID => {
        let requestingUser = sock.request.session.username;
        if(gameID === "all"){
            //TODO: add additional game data to summaries
            let gameSummaries = {};
            for (const [key, value] of Object.entries(games)) {
                gameSummaries[key] = {
                    usernames: value.usernames,
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
            else{
                const requestedGameCopy = getSendableGame(games[parseInt(gameID, 10)], requestingUser);
                sock.emit('gameResponse', requestedGameCopy);
                sock.data.username = requestingUser;
                sock.join(gameID);
            }
        }
        
    });
    sock.on('newGame', ({numPlayers, creator}) => {
        // creator arg no longer used, left in place for demonstration
        const newGameID = game.createGame(games, parseInt(numPlayers, 10), sock.request.session.username);
        const gameSummary = {
            id: newGameID,
            usernames: games[newGameID].usernames,
            max_players: games[newGameID].max_players,
            game_started: games[newGameID].state.game_started,
            game_ended: games[newGameID].state.game_ended
        };
        updateObject = {
            "action": "addGame",
            "game": gameSummary
        }
        io.emit('gameListUpdate', updateObject);
         
    });
    sock.on('gameAction', ({game_id, updateType, updateData}) => {
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
            if(verbose){console.log(`Failed to update game because: ${updateResult}.`);}
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
    game.createGame(games, 6, 'tate');
    console.log(game.updateGame(games[updateID], 7654, "joinGame", {}))
    console.log(game.updateGame(games[updateID], 7653, "joinGame", {}))
    console.log(game.updateGame(games[updateID], 7652, "joinGame", {}))

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
