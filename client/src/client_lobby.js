const loadGames = (games) => {

    for (const [key, value] of Object.entries(games)) {
        const gameElements = 
            `<li>Game #${key}
                <a href="/game?gameid=${key}">
                    <button>Watch</button>
                </a>
                <a href="/game?gameid=${key}">
                    <button>Join</button>
                </a>
            </li>`;
        document.querySelector('#games').innerHTML += gameElements;
    }
};
const updateGames = (update) => {
    if(update.action === "addGame"){
        const id = update.game.id;
        const gameElements = 
            `<li>Game #${id}
                <a href="/game?gameid=${id}">
                    <button>Watch</button>
                </a>
                <a href="/game?gameid=${id}">
                    <button>Join</button>
                </a>
            </li>`;
        document.querySelector('#games').innerHTML += gameElements;
    }
}
const onNewGame = (creator) => (sock) => (e) => {
    e.preventDefault();
    numPlayers = document.querySelector('#num-players').value;
    console.log(creator);
    sock.emit('newGame', {numPlayers, creator});
};



(() => {
    const sock = io();
    sock.on('gameResponse', loadGames);
    sock.on('gameListUpdate', updateGames);
    
    
    sock.emit('gameRequest', "all");
    let currentUser = localStorage.getItem('username');
    console.log(currentUser);
    document
    .querySelector('#new-game-form')
    .addEventListener('submit', onNewGame(currentUser)(sock));




})();