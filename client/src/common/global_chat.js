const log = (messageObj) => {
    let location = getLocation();
    let messageContentSpan = `<span>${messageObj.message_content}</span>`;

    if(JSON.parse(localStorage.muteList).includes(messageObj.sender)){
        //received message from muted player
        return false;
    }
    if(JSON.parse(localStorage.muteList).includes('everyone')){
        //player messages are muted
        if(!['server', 'COMMAND_RUN', 'SERVER', localStorage.username].includes(messageObj.sender)){
            return false;
        }
    }
    if(JSON.parse(localStorage.muteList).includes('lobby')){
        //lobby messages are muted
        if(messageObj.origin === 'lobby' && location !== 'lobby' &&
            !messageObj.mentions.includes(localStorage.username) && !messageObj.mentions.includes('everyone'))
        { //still send messages if user is in the lobby, or if user is mentioned.
            return false;
        }
    }

    // determine styles for messages
    let messageColor;
    if(['server', 'COMMAND_RUN', 'SERVER'].includes(messageObj.sender)){
        messageColor = 'var(--main-text-color);';
    }
    else{
        messageColor = '#006eff';
    }
    // const playerMentions = messageObj.mentions.filter((mention) => !['server', 'lobby', 'everyone', 'SERVER'].includes(mention));
    // if(playerMentions.length > 0){
    //     if(playerMentions.includes(localStorage.username)){
    //         messageContentSpan = `<span style="background-color:yellow">${messageObj.message_content}</span>`;
    //     }
    //     else{ //server sends message to everyone, so we should hide if the origin is not current location or lobby.
    //         if(messageObj.mentions.includes('everyone')){
    //             //do nothing, show the message
    //         }
    //         else if(messageObj.mentions.includes('lobby') && location === 'lobby'){
    //             //do nothing, show the message
    //         }
    //         else if(!(['lobby', location].includes(messageObj.origin))){
    //             return false;
    //         }
    //     }
    // }
    // let originSpan = '';
    // if(messageObj.origin !== location){
    //     originSpan = `<span> (${messageObj.origin})</span>`;
    // }
    const parent = document.querySelector(`#messages-${messageObj.target}`);
    const newMessage = `<li style="color:${messageColor}"><span>${messageObj.sender}:</span> ${messageContentSpan}</li>`;

    parent.insertAdjacentHTML('beforeend', newMessage);
    parent.scrollTop = parent.scrollHeight;
};

const onChatSubmitted = (element, sock) => (e) => {
    e.preventDefault();
    const target = element.getAttribute('chattarget')

    let location = getLocation();
    const input = document.querySelector(`#${target}-chat-input`);
    let text = input.value;
    input.value = '';

    if(text.charAt(0) === '/'){
        if(text.indexOf('mute ') === 1){
            let userToMute = text.split(' ')[1];
            userToMute = userToMute.replace('@', '');
            let muteList = JSON.parse(localStorage.muteList);
            muteList.push(userToMute);
            localStorage.muteList = JSON.stringify(muteList);
        }
        else if(text.indexOf('unmute') === 1){
            let userToUnMute = text.split(' ')[1];
            userToUnMute = userToUnMute.replace('@', '');
            if(userToUnMute === 'everyone'){
                localStorage.muteList = JSON.stringify([]);
            }
            else{
                let muteList = JSON.parse(localStorage.muteList);
                muteList = muteList.filter((element) => element !== userToUnMute);
                localStorage.muteList = JSON.stringify(muteList);
            }
        }
        else if(text.indexOf('hidestats') === 1){
            localStorage.hideStats = 'true';
        }
        else if(text.indexOf('unhidestats') === 1){
            localStorage.hideStats = 'false';
        }
        else if(text.indexOf('help') === 1){
            text += '<br><br>You can use the following commands:<br><br>/mute &lt;username&gt; - block messages from a user<br><br>/unmute &lt;username&gt; - unmute user<br><br>See the about page for more info.'
        }
        else{
            text = 'invalid_command';
        }
        //send confirmation message locally
        log({
            sender: 'COMMAND_RUN',
            origin: location,
            target: target,
            'mentions': [],
            message_content: text});
        return true;
    }

    sock.emit('message', {text, location, target});
};

const getLocation = () => {
    // find location: string should be in the same format as lastKnownLocation on server, and origin in message objects
    let location = window.location.href.split("/")[window.location.href.split("/").length - 1];
    if(location === ''){
        location = 'lobby'; // root redirects to lobby
    }
    else if(location.includes('game')){
        location = 'game' + window.location.href.split("gameid=")[window.location.href.split("gameid=").length - 1];
    }
    return location;
}

(() => {
    if(!('muteList' in localStorage)){
        localStorage.muteList = JSON.stringify([]);
    }

    const sock = window.active_socket_conn;
    sock.on('message', log);
    
    document
    .querySelectorAll('.chat-form').forEach((element) => element.addEventListener('submit', onChatSubmitted(element, sock)));

    if(getLocation() === 'lobby'){
        let welcomeMessage = (`Hi ${localStorage.username}, welcome to OnlineAcquire.com!<br><br><br>
        You can start a new game over here >>>><br><br><br>
        Or join a game waiting for players >>>><br><br><br>
        Click to join the <a class="underlined-link" href="https://discord.gg/D5Q72xppmZ" target="_blank" rel="noopener noreferrer">Discord Server</a>! Chat with other players about games and strategy, or submit ideas and feedback for the site. Announcements about the site or events will be posted on Discord.<br><br><br>`);
        log({
            sender: 'SERVER',
            origin: 'lobby',
            target: 'lobby',
            'mentions': [],
            message_content: welcomeMessage});
    }
    
})();