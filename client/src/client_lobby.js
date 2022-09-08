"use strict";

const loadGames = (sock) => (games) => {
    console.log(games);
    /**
     * Expecting to receive games object in the following format:
     * {
     * '1': {
     *      usernames: ['abc', 'xyz',...],
     *      max_players: 5,
     *      game_started: true,
     *      game_ended: false,
     *    },
     * '2': {...},
     *  .
     *  .
     *  .
     * }
     */
    for (const [key, value] of Object.entries(games)) {
        let gameSummary = value;
        gameSummary.id = key;
        const updateObject = {
            'action': 'addGame',
            'game': gameSummary
        }
        updateGames(sock)(updateObject);
    }
};

const updateGames = (sock) => (update) => {
    if(update.action === 'addGame'){
        const id = update.game.id;
        let playerList = '<ul class="player-list">';
        update.game.usernames.forEach((username) => {
            let watchingLabel = '';
            let inGame;
            if(update.game.playerDetails[username].location === 'watcher'){
                watchingLabel = ' (watching)';
                inGame = true;
            }
            else{
                inGame = update.game.playerDetails[username].location.substring(4) === id.toString();
            }
            playerList += `<li inGame="${inGame}" username="${username}">${username}${watchingLabel}</li>`;
        });
        playerList += '</ul>';
        const gameElements = 
            `<li gamenum="${id}">
                <span class="game-label">Game #${id}</span>
                <a href="/game?gameid=${id}">
                    <button id="watch${id}">Watch</button>
                </a>
                <a href="/game?gameid=${id}">
                    <button id="join${id}">Join</button>
                </a>
                ${playerList}
            </li>`;
        document.querySelector('#games').insertAdjacentHTML("afterbegin", gameElements);
        document.querySelector(`#join${id}`).addEventListener('click', onJoinGame(id, sock));
    }
    else if(update.action === 'removeGame'){
        document.querySelector(`#games [gamenum="${update.game}"]`).remove();
    }
    else if(update.action === 'addPlayer'){ //add a username to a game
        let usernameDOMElement = document.querySelector(`[gamenum="${update.game.id}"] [username="${update.username}"]`);
        if(usernameDOMElement){ //user already in this player list: user is probably re-connecting
            usernameDOMElement.setAttribute('inGame', 'true'); //Different styles for users in and out of games
        }
        else{ //user not in player list yet
            let watchingLabel = '';
            if(update.watcher){
                watchingLabel = ' (watching)';
            }
            let newPlayer = `<li username="${update.username}">${update.username}${watchingLabel}</li>`;
            document.querySelector(`[gamenum="${update.game.id}"] .player-list`).insertAdjacentHTML('beforeend', newPlayer);
        }
    }
    else if(update.action === 'removePlayer'){ //remove a username from a game
        document.querySelector(`[gamenum="${update.game.id}"] [username="${update.username}"]`).remove();
    }
    else if(update.action === 'playerDisconnected'){ 
        document.querySelector(`[gamenum="${update.game.id}"] [username="${update.username}"]`).setAttribute('inGame', 'false');
        //TODO: This fires whenever a user leaves a game page, whether or not they were a game player
        // should probably handle this case separately.
    }
    else{
        console.log("Unexpected message, better look into this...");
    }
}
const onNewGame = (sock) => (e) => {
    e.preventDefault();
    let numPlayers = document.querySelector('#num-players').value;
    let timePerPlayer = document.querySelector('#time-per-player').value;
    //let stallProof = document.querySelector('#stall-proof').checked;
    sock.emit('newGame', {numPlayers, timePerPlayer}); 
};

const onJoinGame = (game, sock) => (e) => {
    e.preventDefault();
    localStorage.setItem('current_game_id', game);
    sock.emit('gameAction', {game_id: game, updateType: 'joinGame', updateData: {}});
    location.href = `/game?gameid=${game}`;
};

const updateLobby = (update) => {
    const userListNode = document.querySelector('#lobby-user-list');
    const lobbyHeaderContainer = document.querySelector('.lobby-header-container');
    if(update.action === 'add'){
        update.users.forEach((username) => {
            console.log('here')
            let usernameDOMElement = userListNode.querySelector(`[username="${username}"]`);
            if(!usernameDOMElement){
                userListNode.insertAdjacentHTML('beforeend', `<li username="${username}">${username}</li>`);
                document.querySelector('#num-users-in-lobby').textContent++;
            }
        });
        if(lobbyHeaderContainer.classList.contains('active')){ // Forgive me Abramov...
            userListNode.style.maxHeight = userListNode.scrollHeight + "px";
        }
    }
    else if(update.action === 'remove'){
        update.users.forEach((username) => {
            let usernameDOMElement = userListNode.querySelector(`[username="${username}"]`);
            if(usernameDOMElement){
                userListNode.style.height = userListNode.scrollHeight + "px";
                if(lobbyHeaderContainer.classList.contains('active')){ // Forgive me Abramov...
                    userListNode.style.maxHeight = (userListNode.scrollHeight - usernameDOMElement.clientHeight) + "px";
                }
                usernameDOMElement.remove();
                document.querySelector('#num-users-in-lobby').textContent--;
            }
        });
    }
};

const displayUserList = (event) => {
    console.log(event.currentTarget);
    event.currentTarget.classList.toggle('active');
    const caret = event.currentTarget.querySelector('.collapse-caret');
    const userList = event.currentTarget.parentNode.querySelector('.user-list');
    if(userList.style.maxHeight){
        userList.style.maxHeight = null;
        caret.textContent = '>';
    }
    else {
        userList.style.maxHeight = userList.scrollHeight + "px";
        caret.textContent = 'v';
    }
};

(() => {
    const sock = io();
    window.active_socket_conn = sock;
    sock.on('gameResponse', loadGames(sock));
    sock.on('gameListUpdate', updateGames(sock));
    sock.on('lobbyUpdate', updateLobby);
    
    
    sock.emit('gameRequest', "all");
    sock.emit('joinLobby');
    let currentUser = localStorage.getItem('username'); //There has to be a better way to do this
    document
    .querySelector('#new-game-form')
    .addEventListener('submit', onNewGame(sock));

    document
    .querySelectorAll('.header-container').forEach(header => header.addEventListener('click', displayUserList));
    /*
    document
    .querySelector('#join1')
    .addEventListener('click', onJoinGame(1, sock));
    */

    // Force reload when page is accessed with the back button.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          // page was restored from the bfcache
          window.location.reload();
        }
    });



})();