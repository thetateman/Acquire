const logout = () => {
    fetch('/api/logoutUser', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(function(response){
        location.href = "/";
    })
    .catch((error) => {
    console.error('Error:', error);
    });
    
};

const log = (text) => {
    const parent = document.querySelector('#events');
    const el = document.createElement('li');
    el.innerHTML = text;

    parent.appendChild(el);
    parent.scrollTop = parent.scrollHeight;
};

const onChatSubmitted = (sock) => (e) => {
    e.preventDefault();

    const input = document.querySelector('#chat');
    const text = input.value;
    input.value = '';

    sock.emit('message', text);
};

const addBoard = () => {
    let spaces = "";
    for(let i=0; i<9; i++){
        spaces += "<tr>";
        for(let j=0; j<12; j++){
            spaces += `<td x="${j}" y="${i}">${j+1}${String.fromCharCode(i+65)}</td>`;
        }
        spaces += "</tr>";
    }
    document.querySelector(".game-board").insertAdjacentHTML("beforeend", spaces);
};

const updateTile = (x, y, color) => {
    let tile = document.querySelector(`[x="${x}"][y="${y}"]`);
    console.log(tile);
    tile.style["background-color"] = color;
    tile.style["border-color"] = color;
    tile.style["border-style"] = "outset";
};

const tileClickHandler = (e, sock) => {
    console.log(`clicked x:${e.getAttribute('x')} y:${e.getAttribute('y')}`);
    sock.emit('turn', {x: parseInt(e.getAttribute('x'), 10), y: parseInt(e.getAttribute('y'), 10)});
};

const populateGame = (game) => {
    // Start by populating the stats table.
    const chains = ['i', 'c', 'w', 'f', 'a', 't', 'l'];
    let playerRows = ""; // Populate player data: usernames, chains, cash.
    for(let i=0; i<game.num_players; i++){
        let playerState = game.state.player_states[i];
        let chainData = "";
        chains.forEach((chain) => {chainData += `<td>${playerState[chain]}</td>`});
        playerRows += `<tr><td>${game.usernames[i]}</td>`+ chainData +
        `<td>${playerState['cash']}</td></tr>`;
    }
    document.querySelector("#stats-table-header-row").insertAdjacentHTML("afterend", playerRows);

    // Build and add the table rows for misc stats
    let bankShareRow = "<td>Bank Shares</td>";
    chains.forEach((chain) => {bankShareRow += `<td>${game.state.bank_shares[chain]}</td>`});
    let chainSizeRow = "<td>Chain Size</td>";
    chains.forEach((chain) => {chainSizeRow += `<td>${game.state.chains[chain].length}</td>`});
    let priceRow = "<td>Price</td>";
    chains.forEach((chain) => {priceRow += `<td>${game.state.share_prices[chain]}</td>`});
    let miscStats = "<tr>" + bankShareRow + "</tr><tr>" + chainSizeRow + "</tr><tr>" + priceRow + "</tr>";
    
    document.querySelector("#stats-placeholder-row-parent").insertAdjacentHTML("afterend", miscStats);
}

(() => {
    const sock = io();
    addBoard();
    sock.on('message', log);
    sock.on('gameResponse', populateGame); //TODO: populate game with this.
    sock.on('turn', ({ x, y, color}) => updateTile(x, y, color));
    
    document.querySelectorAll('.game-board td')
    .forEach(e => e.addEventListener('click', function() {tileClickHandler(e, sock);}));
    
    document
    .querySelector('#chat-form')
    .addEventListener('submit', onChatSubmitted(sock));

    document
    .querySelector('#logout-button')
    .addEventListener('click', logout);

    //canvas.addEventListener('click', onClick);
    sock.emit('gameRequest', window.location.href.split("gameid=").at(-1));

})();