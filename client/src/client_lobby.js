const loadGames = (sock) => (games) => {
    //TODO: Currently receiving entire games object from server. For scalability this data structure should be paired down.
    console.log(games);
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



(() => {
    const sock = io();
    sock.on('gameResponse', loadGames(sock));
    sock.on('gameListUpdate', updateGames(sock));
    
    
    sock.emit('gameRequest', "all");
    let currentUser = localStorage.getItem('username'); //There has to be a better way to do this
    document
    .querySelector('#new-game-form')
    .addEventListener('submit', onNewGame(currentUser)(sock));
    /*
    document
    .querySelector('#join1')
    .addEventListener('click', onJoinGame(1, sock));
    */




})();