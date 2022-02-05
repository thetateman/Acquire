const loadGames = (games) => {

    for (const [key, value] of Object.entries(games)) {
        let gameElements = `<li>Game #${key}
                    <button>Watch</button>
                    <button>Join</button>
                </li>`;
        document.querySelector('#games').innerHTML += gameElements;
    }
};
const updateGames = (update) => {
    if(update.action === "addGame"){
        let gameElements = `<li>Game #${update.game.id}
                    <button>Watch</button>
                    <button>Join</button>
                </li>`;
        document.querySelector('#games').innerHTML += gameElements;
    }
}
const onNewGame = (sock) => (e) => {
    e.preventDefault();
    numPlayers = document.querySelector('#num-players').value;
    sock.emit('newGame', {numPlayers});
};



(() => {
    const sock = io();
    sock.on('gameResponse', loadGames);
    sock.on('gameListUpdate', updateGames);

    sock.emit('gameRequest', "all");

    document
    .querySelector('#new-game-form')
    .addEventListener('submit', onNewGame(sock));




})();