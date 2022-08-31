const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameSchema = new Schema({
    time_per_player: Number, // time in milliseconds
    usernames :[String], //In place order (1st place at index 0, etc.)
    networths: [String],
    players_timed_out: [String],
});

module.exports = mongoose.model("Game", gameSchema);