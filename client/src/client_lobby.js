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
        const gameElements = 
            `<li>Game #${key}
                <a href="/game?gameid=${key}">
                    <button id="watch${key}">Watch</button>
                </a>
                <a href="/game?gameid=${key}">
                    <button id="join${key}">Join</button>
                </a>
            </li>`;
        document.querySelector('#games').insertAdjacentHTML("beforeend", gameElements);
        document.querySelector(`#join${key}`).addEventListener('click', onJoinGame(key, sock));
    }
};
//TODO: Currently receiving entire game object from server. For scalability this data structure should be paired down.
const updateGames = (sock) => (update) => {
    if(update.action === "addGame"){
        const id = update.game.id;
        const gameElements = 
            `<li>Game #${id}
                <a href="/game?gameid=${id}">
                    <button id="watch${id}">Watch</button>
                </a>
                <a href="/game?gameid=${id}">
                    <button id="join${id}">Join</button>
                </a>
            </li>`;
        document.querySelector('#games').insertAdjacentHTML("beforeend", gameElements);
        document.querySelector(`#join${id}`).addEventListener('click', onJoinGame(id, sock));
    }
}
const onNewGame = (creator) => (sock) => (e) => {
    e.preventDefault();
    numPlayers = document.querySelector('#num-players').value;
    console.log(creator);
    creator = "testtext"
    sock.emit('newGame', {numPlayers, creator}); 
    // creator arg no longer used by server, left in place for demonstration
};

const onJoinGame = (game, sock) => (e) => {
    e.preventDefault();
    localStorage.setItem('current_game_id', game);
    sock.emit('gameAction', {game_id: game, updateType: 'joinGame', updateData: {}});
    location.href = `/game?gameid=${game}`;
};

const updateLobby = (connectedUsers) => {
    const userListNode = document.querySelector('#lobby-user-list');
    let userList = "";
    connectedUsers.forEach((user) => {
        userList += `<li>${user}</li>`;
    });
    userListNode.innerHTML = userList;
};

const displayLobbyList = () => {
    console.log("here");
    document
    .querySelector('.lobby-header-container')
    .classList.toggle('active');
    const caret = document.querySelector('#collapse-caret');
    const lobbyList = document.querySelector('#lobby-user-list');
    if(lobbyList.style.maxHeight){
        lobbyList.style.maxHeight = null;
        caret.textContent = '>';
    }
    else {
        lobbyList.style.maxHeight = lobbyList.scrollHeight + "px";
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
    .addEventListener('submit', onNewGame(currentUser)(sock));

    document
    .querySelector('.lobby-header-container')
    .addEventListener('click', displayLobbyList);
    /*
    document
    .querySelector('#join1')
    .addEventListener('click', onJoinGame(1, sock));
    */




})();