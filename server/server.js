const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');

const apiRouter = require("./api/api.router.js");

const userModel = require("./models/User");

const MongoStore = require('connect-mongo')(session);

require('dotenv').config();


const connection = mongoose.createConnection(process.env.RESTREVIEWS_DB_URI);



let games = {};
function createGame(games, numPlayers){
    gameIDs = Object.keys(games)
    let id;
    for(i = 1; i < 10000; i++){
        if(!gameIDs.includes(i.toString())){
            id = i;
            break;
        }
    }
    let newGame = {
        id: id,
        user_ids: new Array(numPlayers).fill(-1),
        state: {
            inPlay: true,
            turn: 0,
            board: [
            ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
            ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
            ['e', 'e', 'e', 'e', 'e', 'e', 'l', 'l', 'e', 'e', 'e', 'e',],
            ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
            ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
            ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 's', 'e', 'e', 'e',],
            ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
            ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',],
            ['e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',]
            ],
            bank_shares: {
                imperial: 25,
                continental: 25,
                american: 25, 
                worldwide: 25,
                festival: 25, 
                luxor: 25,
                tower: 25
            },
            player_states: [
                {
                tiles: [],
                imperial: 25,
                continental: 25,
                american: 25, 
                worldwide: 25,
                festival: 25, 
                luxor: 25,
                tower: 25
                }
            ]
        }

    };
    games[id] = newGame;
    return id;
}

function updateGame(game, userID, updateType, updateData){
    /**
    * Called after receiving game updating websocket message, updates in-memory game object.
    * @param {object} game - the game to be updated.
    * @param {int} userID - the id of the user who initiated the action.
    * @param {string} updateType - updateType should be in: ['playTile', 'purchaseShares', 'chooseRemainingChain', 'disposeShares', 'endGame'].
    * @param {object} updateData - action details, e.g., coordinates of tile played.
    * @returns {string} 'Success' or error string
     */

     switch(updateType){
        case 'playTile':
            console.log("here");
            game.state.turn = updateData.x;
            break;
        case 'purchaseShares':

            break;
        case 'chooseRemainingChain':

            break;
        case 'disposeShares':

            break;
        case 'endGame':

            break;
        default:
            console.log("Not a valid updateType.")
            return "invalidUpdateType";
     }
}





const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const sessionStore = new MongoStore({
    mongooseConnection: connection,
    collection: 'sessions'
});

app.use(session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));


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

io.on('connection', (sock) => {
   
    current_player_id = player_id;
    player_id++;
    colors = ["red", "orange", "yellow", "green", "blue", "purple", "black"]
    color = colors[current_player_id % colors.length];
    sock.emit('message', 'You are connected');

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
    sock.on('newGame', gameInfo => {
        const newGameID = createGame(games, gameInfo.numPlayers);
        updateObject = {
            "action": "addGame",
            "game": games[newGameID],
        }
        io.emit('gameListUpdate', updateObject);
    });
    sock.on('gameAction', ({game, userID, updateType, updateData}) => {
        const updateResult = updateGame(game, userID, updateType, updateData);
    });
});

server.on('error', (err) => {
    console.error(err);
});

server.listen(8080, () => {
    console.log('server is ready.');
});


let updateID = 1;
createGame(games, 4);
createGame(games, 5);
console.log(games);
updateGame(games[updateID], 4, "playTile", {x:5, y:2});
console.log(Object.entries(games));