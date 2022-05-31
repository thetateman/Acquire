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
    sock.emit('message', 'You are connected');

    sock.on('message', (text) => {
        io.emit('message', text);
        console.log(`got the message: ${text}.`);
    });

    sock.on('gameRequest', gameID => {
        let requestingUser = sock.request.session.username;
        if(gameID === "all"){
            //TODO: add additional game data to summaries
            let gameSummaries = {};
            for (const [key, value] of Object.entries(games)) {
                gameSummaries[key] = {
                    usernames: value.usernames
                };
            }
            sock.emit('gameResponse', gameSummaries);
        }else{
            if(!Object.keys(games).includes(gameID)){
                console.log("Requested a game that does not exist!");
                sock.emit('gameResponse', "none");
            }
            else{
                const requestedGameCopy = getSendableGame(games[parseInt(gameID, 10)], requestingUser);
                sock.emit('gameResponse', requestedGameCopy);
                sock.join(gameID);
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
        console.log(games[newGameID].usernames);
        io.emit('gameListUpdate', updateObject);
         
    });
    sock.on('gameAction', ({game_id, updateType, updateData}) => {
        if(!Object.keys(games).includes(game_id)){
            console.log("Requested a game that does not exist!");
            sock.emit('error', "none"); //TODO: add catch-all error listener to client.
            return false;
        }
        console.log(`Game update: game: ${game_id}, updateType: ${updateType}, updateData: ${JSON.stringify(updateData)}`);
        let updateResult;
        try{
            updateResult = game.updateGame(games[game_id], sock.request.session.username, updateType, updateData, true);
        } 
        catch(err){
            console.log(err);
        }
        if(updateResult !== "success"){
            console.log(`Failed to update game because: ${updateResult}.`);
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
        else if(updateType === "playTile"){
            io.in(game_id.toString()).emit('gameUpdate', {type: "playTile", game: getSendableGame(games[game_id], sock.request.session.username)});
        }
        else if(updateType === "chooseNewChain"){ //TODO: decide if these cases should send different data.
            io.in(game_id.toString()).emit('gameUpdate', {type: "chooseNewChain", game: getSendableGame(games[game_id], sock.request.session.username)});
        }
        else if(updateType === "chooseRemainingChain"){ //TODO: decide if these cases should send different data.
            io.in(game_id.toString()).emit('gameUpdate', {type: "chooseRemainingChain", game: getSendableGame(games[game_id], sock.request.session.username)});
        }
        else if(updateType === "disposeShares"){ //TODO: decide if these cases should send different data.
            io.in(game_id.toString()).emit('gameUpdate', {type: "disposeShares", game: getSendableGame(games[game_id], sock.request.session.username)});
        }
        else if(updateType === "purchaseShares"){ //TODO: decide if these cases should send different data.
            io.in(game_id.toString()).emit('gameUpdate', {type: "disposeShares", game: getSendableGame(games[game_id], sock.request.session.username)});
        }
        else if(updateType === "startGame"){
            io.in(game_id.toString()).emit('gameUpdate', {type: "startGame", game: getSendableGame(games[game_id], sock.request.session.username)});
        }
        else{
            // TODO: break this up into more specific cases, so we can send more specific data, instead of the whole game object.
            io.in(game_id.toString()).emit('gameUpdate', {type: "missing", game: getSendableGame(games[game_id], sock.request.session.username)});
        }
        console.log(updateResult);
    });
});

server.on('error', (err) => {
    console.error(err);
});

server.listen(8080, () => {
    console.log('server is ready.');
});


//Create and edit some placeholder games for testing
//TODO: updateGame unit tests
let updateID = 2;
game.createGame(games, 4, 4);
game.createGame(games, 6, 'tate');
console.log(game.updateGame(games[updateID], 7654, "joinGame", {}))
console.log(game.updateGame(games[updateID], 7653, "joinGame", {}))
console.log(game.updateGame(games[updateID], 7652, "joinGame", {}))

console.log(games[updateID].usernames);
//console.log(game.updateGame(games[updateID], 7655, "startGame", {}));
console.log(game.updateGame(games[updateID], 7655, "playTile", {x:0, y:0}, true));
console.log(game.updateGame(games[updateID], 7655, "purchaseShares", {endGame: false, purchase: {}}));
console.log(game.updateGame(games[updateID], 7654, "playTile", {x:4, y:2}, true));
console.log(game.updateGame(games[updateID], 7654, "purchaseShares", {endGame: false, purchase: {}}));
/*
console.log(game.updateGame(games[updateID], 7653, "playTile", {x:3, y:2}, true));
console.log(game.updateGame(games[updateID], 7653, "chooseNewChain", {newChainChoice: 'i'}));
console.log(game.updateGame(games[updateID], 7653, "purchaseShares", {endGame: false, purchase: {i: 3}}));
//console.log(games[updateID].state.player_states[0]);
console.log(game.updateGame(games[updateID], 7652, "playTile", {x:6, y:2}, true));
console.log(game.updateGame(games[updateID], 7652, "purchaseShares", {endGame: false, purchase: {i: 2}}));
console.log(game.updateGame(games[updateID], 7655, "playTile", {x:7, y:2}, true));
console.log(game.updateGame(games[updateID], 7655, "chooseNewChain", {newChainChoice: 't'}));
console.log(game.updateGame(games[updateID], 7655, "purchaseShares", {endGame: false, purchase: {t: 3}}));

console.log(game.updateGame(games[updateID], 7654, "playTile", {x:5, y:3}, true));
console.log(game.updateGame(games[updateID], 7654, "purchaseShares", {endGame: false, purchase: {t: 1}}, true));
console.log(game.updateGame(games[updateID], 7653, "playTile", {x:5, y:2}, true));
console.log(game.updateGame(games[updateID], 7653, "chooseRemainingChain", {remainingChainChoice: 'i'}, true));
console.log(game.updateGame(games[updateID], 7655, "disposeShares", {keep: 0, trade: 2, sell: 1}, true));
console.log(game.updateGame(games[updateID], 7654, "disposeShares", {keep: 1, trade: 0, sell: 0}, true));


console.log(game.updateGame(games[updateID], 1, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 2, "playTile", {x:1, y:2}, true));
console.log(game.updateGame(games[updateID], 2, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 3, "playTile", {x:1, y:0}, true));
console.log(game.updateGame(games[updateID], 3, "chooseNewChain", {newChainChoice: 'f'}, true));
console.log(game.updateGame(games[updateID], 3, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 4, "playTile", {x:1, y:1}, true));
console.log(game.updateGame(games[updateID], 4, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 0, "playTile", {x:2, y:2}, true));
console.log(game.updateGame(games[updateID], 0, "disposeShares", {}, true));
console.log(game.updateGame(games[updateID], 0, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 1, "playTile", {x:0, y:8}, true));
console.log(game.updateGame(games[updateID], 1, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 2, "playTile", {x:1, y:8}, true));
console.log(game.updateGame(games[updateID], 2, "chooseNewChain", {newChainChoice: 'w'}, true));
console.log(game.updateGame(games[updateID], 2, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 3, "playTile", {x:3, y:8}, true));
console.log(game.updateGame(games[updateID], 3, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 4, "playTile", {x:4, y:8}, true));
console.log(game.updateGame(games[updateID], 4, "chooseNewChain", {newChainChoice: 'c'}, true));
console.log(game.updateGame(games[updateID], 4, "purchaseShares", {endGame: false, purchase: {}}, true));

console.log(game.updateGame(games[updateID], 0, "playTile", {x:6, y:8}, true));
console.log(game.updateGame(games[updateID], 0, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 1, "playTile", {x:7, y:8}, true));
console.log(game.updateGame(games[updateID], 1, "chooseNewChain", {newChainChoice: 'a'}, true));
console.log(game.updateGame(games[updateID], 1, "purchaseShares", {endGame: false, purchase: {}}, true));

console.log(game.updateGame(games[updateID], 2, "playTile", {x:9, y:8}, true));
console.log(game.updateGame(games[updateID], 2, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 3, "playTile", {x:10, y:8}, true));
console.log(game.updateGame(games[updateID], 3, "chooseNewChain", {newChainChoice: 'l'}, true));
console.log(game.updateGame(games[updateID], 3, "purchaseShares", {endGame: false, purchase: {}}, true));


console.log(game.updateGame(games[updateID], 4, "playTile", {x:5, y:5}, true));
console.log(game.updateGame(games[updateID], 4, "purchaseShares", {endGame: false, purchase: {}}, true));
console.log(game.updateGame(games[updateID], 0, "playTile", {x:5, y:6}, true));
console.log(game.updateGame(games[updateID], 0, "chooseNewChain", {newChainChoice: 'f'}, true));
console.log(game.updateGame(games[updateID], 0, "purchaseShares", {endGame: false, purchase: {}}, true));

console.log(game.updateGame(games[updateID], 1, "playTile", {x:11, y:0}, true));
console.log(game.updateGame(games[updateID], 1, "purchaseShares", {endGame: false, purchase: {f: 2, a: 1}}, true));
console.log(game.updateGame(games[updateID], 2, "playTile", {x:11, y:2}, true));
console.log(game.updateGame(games[updateID], 2, "purchaseShares", {endGame: false, purchase: {w: 1, i: 2}}, true));
console.log(game.updateGame(games[updateID], 3, "playTile", {x:11, y:4}, true));
console.log(game.updateGame(games[updateID], 3, "purchaseShares", {endGame: false, purchase: {i: 3}}, true));
console.log(game.updateGame(games[updateID], 4, "playTile", {x:11, y:6}, true));
console.log(game.updateGame(games[updateID], 4, "purchaseShares", {endGame: true, purchase: {a: 1}}, true));
*/

console.log(games[updateID].state.player_states[0]);
console.log(games[updateID].state.player_states[1]);
console.log(games[updateID].state.player_states[2]);
console.log(games[updateID].state.player_states[3]);
console.log(games[updateID].state.bank_shares);

