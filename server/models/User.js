const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    date_created: { 
        type: Date, 
        default: Date.now
    }, 
    p2_skill: {
        type: [Number],
        default: [25.0, 25.0/3.0] // TrueSkill skill parameters: [mu, sigma]
    },
    p3_skill: {
        type: [Number],
        default: [25.0, 25.0/3.0]
    },
    p4_skill: {
        type: [Number],
        default: [25.0, 25.0/3.0]
    },
    p5_skill: {
        type: [Number],
        default: [25.0, 25.0/3.0]
    },
    p6_skill: {
        type: [Number],
        default: [25.0, 25.0/3.0]
    },
    p2_record: {
        type: [Number],
        default: [0, 0]
    },
    p3_record: {
        type: [Number],
        default: [0, 0, 0]
    },
    p4_record: {
        type: [Number],
        default: [0, 0, 0, 0]
    },
    p5_record: {
        type: [Number],
        default: [0, 0, 0, 0, 0]
    },
    p6_record: {
        type: [Number],
        default: [0, 0, 0, 0, 0, 0]
    },
    
    
});

module.exports = mongoose.model("User", userSchema);