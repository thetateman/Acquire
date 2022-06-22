const log = (messageObj) => {
    const location = window.location.href.split("/")[window.location.href.split("/").length - 1];
    if(JSON.parse(localStorage.muteList).includes(messageObj.sender)){
        //received message from muted player
        return false;
    }
    if(JSON.parse(localStorage.muteList).includes('everyone')){
        //player messages are muted
        if(messageObj.sender !== 'server'){
            return false;
        }
    }
    if(JSON.parse(localStorage.muteList).includes('lobby')){
        //lobby messages are muted
        if(messageObj.origin === 'lobby' && location !== 'lobby'){ //still send messages if user is in the lobby.
            return false;
        }
    }
    const parent = document.querySelector('#messages');
    const newMessage = `<li><span>${messageObj.sender}:</span> ${messageObj.message_content}</li>`;
    console.log(messageObj.origin);

    parent.insertAdjacentHTML('beforeend', newMessage);
    parent.scrollTop = parent.scrollHeight;
};

const onChatSubmitted = (sock) => (e) => {
    e.preventDefault();

    const input = document.querySelector('#chat-input');
    const text = input.value;
    input.value = '';

    if(text.charAt(0) === '/'){
        if(text.indexOf('mute ') === 1){
            const userToMute = text.split(' ')[1];
            let muteList = JSON.parse(localStorage.muteList);
            muteList.push(userToMute);
            localStorage.muteList = JSON.stringify(muteList);
        }
        else if(text.indexOf('unmute') === 1){
            const userToUnMute = text.split(' ')[1];
            if(userToUnMute === 'everyone'){
                localStorage.muteList = JSON.stringify([]);
            }
            else{
                let muteList = JSON.parse(localStorage.muteList);
                muteList = muteList.filter((element) => element !== userToUnMute);
                localStorage.muteList = JSON.stringify(muteList);
            }
        }
    }

    sock.emit('message', text);
};

(() => {
    if(!('muteList' in localStorage)){
        localStorage.muteList = JSON.stringify([]);
    }

    const sock = window.active_socket_conn;
    sock.on('message', log);
    
    document
    .querySelector('#chat-form')
    .addEventListener('submit', onChatSubmitted(sock));
})();