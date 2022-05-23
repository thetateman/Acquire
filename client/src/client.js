const chains = ['i', 'c', 'w', 'f', 'a', 't', 'l'];
const logout = () => {
    localStorage.clear();
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

const updateGameBoard = (game) => {
    for(let x=0; x<12; x++){
        for(let y=0; y<9; y++){
            if(game.state.board[y][x] !== 'e'){
                updateTile(x, y, game.state.board[y][x]);
            }
        }
    }
};

const updateTile = (x, y, tileType) => {
    const tileColors = {'i': "var(--imperial-color)",
    'c': "var(--continental-color)",
    'w': "var(--worldwide-color)",
    'f': "var(--festival-color)",
    'a': "var(--american-color)",
    't': "var(--tower-color)",
    'l': "var(--luxor-color)",
    'p': "gray",
    's': "black"
    };
    let tile = document.querySelector(`[x="${x}"][y="${y}"]`);
    tile.style["background-color"] = tileColors[tileType];
    tile.style["border-color"] = tileColors[tileType];
    tile.style["border-style"] = "outset";
};

const tileClickHandler = (e, sock) => {
    console.log(`clicked x:${e.getAttribute('x')} y:${e.getAttribute('y')}`);
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'playTile', updateData: {x: parseInt(e.getAttribute('x'), 10), y: parseInt(e.getAttribute('y'), 10)}})
};

const chainSelectHandler = (e, sock) => {
    const chainSelection = e.id.charAt(0);
    //different behavior depending on next expected action
    if(localStorage.getItem('expected_next_action') === 'chooseNewChain'){
        sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'chooseNewChain', updateData: {newChainChoice: chainSelection}});
    }
    else if(localStorage.getItem('expected_next_action') === 'purchaseShares'){
        let numSharesInCart = 0;
        chains.forEach((chain) => numSharesInCart+=parseInt(localStorage[`${chain}InCart`], 10));
        if(numSharesInCart >= 3){
            console.log("You may buy a maximum of 3 shares.");
        }
        else{
            localStorage[`${chainSelection}InCart`]++; //TODO: FIX THIS
        }
    }
    else if(localStorage.getItem('expected_next_action') === 'chooseRemainingChain'){
        sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'chooseRemainingChain', updateData: {remainingChainChoice: chainSelection}});
    }
    //sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'selectChain', updateData: {chain_selection: chainSelection}});
};

const purchaseShares = (e, sock) => {
    //TODO: fix
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'purchaseShares', updateData: {remainingChainChoice: chainSelection}});
};
const disposeShares = (e, sock) => {
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'disposeShares', updateData: {}});
};

const populateGame = (game) => {
    chains.forEach((chain) => localStorage.setItem(`${chain}InCart`, "0"));
    generateStatsTable(game);
    updateGameBoard(game);
    //TODO: Reveal hidden elements if necessary (dispose-shares-table).
};

const updateGame = (gameUpdate) => {
    localStorage.setItem('expected_next_action', gameUpdate.game.state.expectedNextAction);
    if(['playTile', 'chooseNewChain', 'chooseRemainingChain', 'disposeShares'].includes(gameUpdate.type)){
        updateStatsTable(gameUpdate.game); // Specialized function to only update a part of the table would be faster.
        updateGameBoard(gameUpdate.game);
        if(gameUpdate.game.state.expectedNextAction === 'disposeShares'){
            document.querySelector("#dispose-shares-container").style.display = 'flex';
        }
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
};

const updateStatsTable = (game) => {
    for(let i=0; i<game.num_players; i++){
        chains.forEach((chain) => {
            document.querySelector(`[row="${i}"][column="${chain}"]`).innerHTML = game.state.player_states[i][chain];
        });
        document.querySelector(`[row="${i}"][column="cash"]`).innerHTML = game.state.player_states[i]["cash"];
        document.querySelector(`[row="${i}"][column="net"]`).innerHTML = game.state.player_states[i]["net_worth"];
    }
    chains.forEach((chain) => {
        document.querySelector(`[row="bank-shares"][column="${chain}"]`).innerHTML = game.state.bank_shares[chain];
    });
    chains.forEach((chain) => {
        document.querySelector(`[row="chain-size"][column="${chain}"]`).innerHTML = game.state.chains[chain].length;
    });
    chains.forEach((chain) => {
        document.querySelector(`[row="price"][column="${chain}"]`).innerHTML = game.state.share_prices[chain];
    });
}

(() => {
    const sock = io();
    addBoard();
    sock.on('message', log);
    sock.on('gameResponse', populateGame);
    sock.on('gameUpdate', updateGame);
    
    document.querySelectorAll('.game-board td')
    .forEach(e => e.addEventListener('click', function() {tileClickHandler(e, sock);}));

    document.querySelectorAll('#chain-button-row td')
    .forEach(e => e.addEventListener('click', function() {chainSelectHandler(e, sock);}));

    document.querySelectorAll('#dispose-shares-button')
    .forEach(e => e.addEventListener('click', function() {disposeShares(e, sock);}));

    document.querySelectorAll('#buy-shares-button')
    .forEach(e => e.addEventListener('click', function() {purchaseShares(e, sock);}));
    
    document
    .querySelector('#chat-form')
    .addEventListener('submit', onChatSubmitted(sock));

    document
    .querySelector('#logout-button')
    .addEventListener('click', logout);

    //canvas.addEventListener('click', onClick);
    sock.emit('gameRequest', window.location.href.split("gameid=").at(-1));

})();