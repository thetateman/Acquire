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
});

server.on('error', (err) => {
    console.error(err);
});

server.listen(8080, () => {
    console.log('server is ready.');
});