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
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'playTile', updateData: {x: parseInt(e.getAttribute('x'), 10), y: parseInt(e.getAttribute('y'), 10)}})
};

const populateGame = (game) => {
    generateStatsTable(game);

    
};

const updateGame = (gameUpdate) => {
    const chains = ['i', 'c', 'w', 'f', 'a', 't', 'l'];
    if(gameUpdate.type === 'playTile'){

    } 
    else if(gameUpdate.type === 'joinGame'){
        if(gameUpdate.joining_player !== localStorage.getItem('username')){ // if joining player != current user. (Data will have been added already.)
            // Add a new player to the stats table.
            let chainData = "";
            const i = gameUpdate.player_num;
            // build player data row, setting row and column attributes for easy access when updating.
            chains.forEach((chain) => {chainData += `<td row="${i}" column="${chain}">${gameUpdate.player_data[chain]}</td>`});
            let newPlayerRow = `<tr><td row="${i}" column="username">${gameUpdate.joining_player}</td>`+ chainData +
            `<td row="${i}" column="cash">${gameUpdate.player_data['cash']}</td>` +
            `<td row="${i}" column="net">${gameUpdate.player_data['net_worth']}</td></tr>`;
    
            document.querySelector("#stats-placeholder-row-parent").insertAdjacentHTML("beforebegin", newPlayerRow);
        }
    }
    else {
        console.log("Got unrecognized game update...")
    }
    //updateStatsTable(game); //similar to game board
    console.log("got messagedddddddddddddddddddd");
};

const generateStatsTable = (game) => {
    const chains = ['i', 'c', 'w', 'f', 'a', 't', 'l'];
    let playerRows = ""; // Populate player data: usernames, chains, cash.
    for(let i=0; i<game.num_players; i++){
        let playerState = game.state.player_states[i];
        let chainData = "";
        // build player data row, setting row and column attributes for easy access when updating.
        chains.forEach((chain) => {chainData += `<td row="${i}" column="${chain}">${playerState[chain]}</td>`});
        playerRows += `<tr><td row="${i}" column="username">${game.usernames[i]}</td>`+ chainData +
        `<td row="${i}" column="cash">${playerState['cash']}</td>` +
        `<td row="${i}" column="net">${playerState['net_worth']}</td></tr>`;
        
    }
    document.querySelector("#stats-table-header-row").insertAdjacentHTML("afterend", playerRows);

    // Build and add the table rows for misc stats
    let bankShareRow = "<td>Bank Shares</td>";
    chains.forEach((chain) => {bankShareRow += `<td row="bank-shares" column="${chain}">${game.state.bank_shares[chain]}</td>`});
    let chainSizeRow = "<td>Chain Size</td>";
    chains.forEach((chain) => {chainSizeRow += `<td row="chain-size" column="${chain}">${game.state.chains[chain].length}</td>`});
    let priceRow = "<td>Price</td>";
    chains.forEach((chain) => {priceRow += `<td row="price" column="${chain}">${game.state.share_prices[chain]}</td>`});
    let miscStats = "<tr>" + bankShareRow + "</tr><tr>" + chainSizeRow + "</tr><tr>" + priceRow + "</tr>";

    document.querySelector("#stats-placeholder-row-parent").insertAdjacentHTML("afterend", miscStats);
}

(() => {
    const sock = io();
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'joinGame', updateData: {}});
    addBoard();
    sock.on('message', log);
    sock.on('gameResponse', populateGame);
    sock.on('turn', ({ x, y, color}) => updateTile(x, y, color));
    sock.on('gameUpdate', updateGame);
    
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