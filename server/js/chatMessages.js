"use strict";

const fs = require('fs');

const chatMessages = {
    registerChatMessageHandlers: function (games, io, sock){
        /**
        * Sets listener/handler for chat messages on the socket instance. Parses mentions. Determines which room(s) to send 
        * messages to.
        * @param {object} games - the in-memory games object on the server.
        * @param {object} io - the Socket.io server instance.
        * @param {object} sock - the Socket.io socket instance.
        * 
        */
        sock.on('message', ({text, location, target}) => {
            if(text.length > 2000){ // limit message length to 2000 characters
                text = text.substring(0, 1999);
            }
            text = this.escapeHtml(text);
            //write to chat log file
            let logEntry = `${sock.request.session.username} (${sock.request.session.lastKnownLocation}) -> (${target}): ${text}\n`;
            fs.writeFile('../server_data_backup/chatlog.txt', logEntry, { flag: 'a' }, err => {
                if (err) {
                  console.error(err);
                }
                // file written successfully
            });
            //find mentions
            // let atIndicies = [];
            // let spacesAfter = [];
            // let mentions = [];

            // let currAtIndex = text.indexOf('@');
            // while(currAtIndex !== -1){
            //     atIndicies.push(currAtIndex);
            //     spacesAfter.push(text.indexOf(' ', currAtIndex + 1));
            //     currAtIndex = text.indexOf('@', currAtIndex + 1);
            // }
            // if(spacesAfter[spacesAfter.length - 1] === -1){
            //     spacesAfter[spacesAfter.length - 1] = 99999;
            // }

            // for(let i = 0; i < atIndicies.length; i++){
            //     mentions.push(text.substring(atIndicies[i] + 1, spacesAfter[i]));
            // }

            // const playerMentions = mentions.filter((mention) => !['server', 'lobby', 'everyone', 'SERVER'].includes(mention));
            let messageObj = {
                sender: sock.request.session.username,
                origin: sock.request.session.lastKnownLocation,
                'mentions': [],
                target: target,
                message_content: text
            };
            if(target === 'lobby'){
                io.emit('message', messageObj);
                    return true;
            }
            else if(target === "game"){
                if(!location.includes('game')){
                    return false; // not in a game? blackhole this message
                }
                const gameRoom = location.split('game')[1];
                io.in(gameRoom).emit('message', messageObj);
            }
            else {
                console.log(`received a message with ${sock.request.session.lastKnownLocation} origin.`);
            }
        });
    },

    escapeHtml(unsafe)
    {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     },
}

module.exports = chatMessages;