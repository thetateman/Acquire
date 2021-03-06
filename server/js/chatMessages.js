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
        sock.on('message', (text) => {
            //find mentions
            let atIndicies = [];
            let spacesAfter = [];
            let mentions = [];

            let currAtIndex = text.indexOf('@');
            while(currAtIndex !== -1){
                atIndicies.push(currAtIndex);
                spacesAfter.push(text.indexOf(' ', currAtIndex + 1));
                currAtIndex = text.indexOf('@', currAtIndex + 1);
            }
            if(spacesAfter[spacesAfter.length - 1] === -1){
                spacesAfter[spacesAfter.length - 1] = 99999;
            }

            for(let i = 0; i < atIndicies.length; i++){
                mentions.push(text.substring(atIndicies[i] + 1, spacesAfter[i]));
            }

            const playerMentions = mentions.filter((mention) => !['server', 'lobby', 'everyone'].includes(mention));

            if(mentions.includes('everyone') || playerMentions.length > 0){
                io.emit('message', {
                    sender: sock.request.session.username,
                    origin: sock.request.session.lastKnownLocation,
                    'mentions': mentions,
                    message_content: text});
                    return true;
            }
            else if(mentions.includes('lobby')){
                const messageObj = {
                    sender: sock.request.session.username,
                    origin: sock.request.session.lastKnownLocation,
                    'mentions': mentions,
                    message_content: text};
                if(sock.request.session.lastKnownLocation.includes('game')){ // if the message originated in a game, send the message to the game room also
                    const gameRoom = sock.request.session.lastKnownLocation.split('game')[1];
                    io.in('lobby').in(gameRoom).emit('message', messageObj);
                }
                else{
                    io.in('lobby').emit('message', messageObj);
                }
                return true;
            }
            
            if(sock.request.session.lastKnownLocation.includes('game')){
                const gameRoom = sock.request.session.lastKnownLocation.split('game')[1];
                io.in(gameRoom).emit('message', {
                    sender: sock.request.session.username,
                    origin: sock.request.session.lastKnownLocation,
                    'mentions': mentions,
                    message_content: text});
            }
            else if(sock.request.session.lastKnownLocation === 'lobby'){
                io.emit('message', {
                    sender: sock.request.session.username,
                    origin: sock.request.session.lastKnownLocation,
                    'mentions': mentions,
                    message_content: text});
            }
            else {
                console.log(`received a message with ${sock.request.session.lastKnownLocation} origin.`);
            }
        });
    },
}

module.exports = chatMessages;