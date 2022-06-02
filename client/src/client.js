const chains = ['i', 'c', 'w', 'f', 'a', 't', 'l'];

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

const updateTileBank = (game, sock) => {
    document.querySelector('#tile-bank').innerHTML = "";
    game.state.player_states[game.usernames.indexOf(localStorage.username)].tiles
    .forEach((tile) => {
        let tileHTML = `<span x="${tile.x}" y="${tile.y}">${tile.x+1}${String.fromCharCode(tile.y+65)}</span>`;
        document.querySelector('#tile-bank').insertAdjacentHTML('beforeend', tileHTML);
    });
    document.querySelectorAll('#tile-bank span')
    .forEach(e => e.addEventListener('click', function() {tileClickHandler(e, sock);}));
};

const updateChainSelectorRow = (gameState) => {
    chains.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'none');
    let visibleChainSelectors = [];
    if(gameState.expectedNextAction === 'purchaseShares'){
        const cash = gameState.player_states[gameState.turn].cash;
        chains.forEach((chain) => {
            if(gameState.bank_shares[chain] - localStorage[`${chain}InCart`] > 0 && !gameState.available_chains.includes(chain)){
                if(parseInt(localStorage.purchaseTotal, 10) + gameState.share_prices[chain] <= cash){
                    visibleChainSelectors.push(chain);
                }
            }
        });
    } else if(gameState.expectedNextAction === 'chooseNewChain'){
        chains.forEach((chain) => {
            if(gameState.available_chains.includes(chain)){
                visibleChainSelectors.push(chain);
            }
        });
    } else if(gameState.expectedNextAction === 'chooseRemainingChain'){
        chains.forEach((chain) => {
            if(gameState.active_merger.largest_chains.includes(chain)){
                visibleChainSelectors.push(chain);
            }
        });
    } else { // Not a state where we want to display chain selectors.

    }
    visibleChainSelectors.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'inline-flex');
}

const updateTile = (x, y, tileType) => {
    const tileColors = {'i': "var(--imperial-color)",
    'c': "var(--continental-color)",
    'w': "var(--worldwide-color)",
    'f': "var(--festival-color)",
    'a': "var(--american-color)",
    't': "var(--tower-color)",
    'l': "var(--luxor-color)",
    'p': "var(--pending-tile-color)",
    's': "var(--single-tile-color)"
    };
    let tile = document.querySelector(`[x="${x}"][y="${y}"]`);
    tile.style["background-color"] = tileColors[tileType];
    tile.style["border-color"] = tileColors[tileType];
    tile.style["border-style"] = "outset";
    if(tileType === 's'){
        tile.style["color"] = "white";
        tile.style["border-color"] = "var(--single-tile-border-color)";
    }
};

const tileClickHandler = (e, sock) => {
    console.log(`clicked x:${e.getAttribute('x')} y:${e.getAttribute('y')}`);
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'playTile', updateData: {x: parseInt(e.getAttribute('x'), 10), y: parseInt(e.getAttribute('y'), 10)}})
};

const chainSelectHandler = (e, sock) => {
    const chainSelection = e.id.charAt(0);
    const currentGameState = JSON.parse(localStorage.gameState);
    //different behavior depending on next expected action
    if(localStorage.getItem('expected_next_action') === 'chooseNewChain'){
        sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'chooseNewChain', updateData: {newChainChoice: chainSelection}});
        chains.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'none');
    }
    else if(localStorage.getItem('expected_next_action') === 'purchaseShares'){
        let numSharesInCart = 0;
        chains.forEach((chain) => numSharesInCart+=parseInt(localStorage[`${chain}InCart`], 10));
        if(numSharesInCart >= 3){
            console.log("You may buy a maximum of 3 shares.");
        }
        else{
            localStorage[`${chainSelection}InCart`]++;
            localStorage.purchaseTotal = parseInt(localStorage.purchaseTotal, 10) + currentGameState.share_prices[chainSelection];
            document.querySelector('#share-purchase-total').textContent = `Total: ${localStorage.purchaseTotal}`;
            let cartShare = `<span class="cart-share" id="${chainSelection}-cart-share">${chainSelection}</span>`;
            document.querySelector('#share-cart').insertAdjacentHTML('afterbegin', cartShare);
            updateChainSelectorRow(currentGameState);
        }
    }
    else if(localStorage.getItem('expected_next_action') === 'chooseRemainingChain'){
        sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'chooseRemainingChain', updateData: {remainingChainChoice: chainSelection}});
        chains.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'none');
    }
    //sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'selectChain', updateData: {chain_selection: chainSelection}});
};

const disposeSharesEditor = (e) => {
    let disposingChain = localStorage.disposingChain;
    let maxSharesToDispose = parseInt(localStorage.maxSharesToDispose, 10);
    let remainingChain = localStorage.remainingChain;
    let maxSharesToTradeFor = parseInt(localStorage.maxSharesToTradeFor);


    const editAction = e.id.charAt(0);
    const disposalType = e.id.charAt(1);
    if(disposalType === 'k'){
        if(editAction === '+'){
            if(parseInt(localStorage.keep, 10) >= maxSharesToDispose){
                return false;
            }
            localStorage.keep++;
            if(parseInt(localStorage.sell, 10) > 0){
                localStorage.sell--;
            }
            else if(parseInt(localStorage.trade, 10) > 0){
                localStorage.trade = parseInt(localStorage.trade, 10) - 2;
                localStorage.keep++;
            }
            else{
                console.error("this shouldn't happen.");
            }
        }
        else if(editAction === '-'){
            if(parseInt(localStorage.keep, 10) <= 0){
                return false;
            }
            localStorage.keep--;
            localStorage.sell++;
        }
        else if(editAction === 'm'){
            localStorage.keep = maxSharesToDispose;
            localStorage.trade = 0;
            localStorage.sell = 0;
        }
    } 
    else if(disposalType === 't'){
        if(editAction === '+'){
            if(parseInt(localStorage.trade, 10) >= Math.min(maxSharesToDispose - (maxSharesToDispose % 2), maxSharesToTradeFor*2)){
                return false;
            }
            localStorage.trade = parseInt(localStorage.trade, 10) + 2;
            if(parseInt(localStorage.sell, 10) > 1){
                localStorage.sell = parseInt(localStorage.sell, 10) - 2;
            }
            else if(parseInt(localStorage.keep, 10) > 1){
                localStorage.keep = parseInt(localStorage.keep, 10) - 2;
            }
            else{
                console.error("this shouldn't happen.");
            }
        }
        else if(editAction === '-'){
            if(parseInt(localStorage.trade, 10) <= 0){
                return false;
            }
            localStorage.trade = parseInt(localStorage.trade, 10) - 2;
            localStorage.keep = parseInt(localStorage.keep, 10) + 2;
        }
        else if(editAction === 'm'){
            const tradeMax = Math.min(maxSharesToDispose - (maxSharesToDispose % 2), maxSharesToTradeFor*2);
            localStorage.trade = tradeMax;
            localStorage.keep = maxSharesToDispose - tradeMax;
            localStorage.sell = 0;
        }
    }
    else if(disposalType === 's'){
        if(editAction === '+'){
            if(parseInt(localStorage.sell, 10) >= maxSharesToDispose){
                return false;
            }
            localStorage.sell++;
            if(parseInt(localStorage.keep, 10) > 0){
                localStorage.keep--;
            }
            else if(parseInt(localStorage.trade, 10) > 0){
                localStorage.trade = parseInt(localStorage.trade, 10) - 2;
                localStorage.sell++;
            }
            else{
                console.error("this shouldn't happen.");
            }
        }
        else if(editAction === '-'){
            if(parseInt(localStorage.sell, 10) <= 0){
                return false;
            }
            localStorage.sell--;
            localStorage.keep++;
        }
        else if(editAction === 'm'){
            localStorage.sell = maxSharesToDispose;
            localStorage.trade = 0;
            localStorage.keep = 0;
        }
    }
    // Update disposal editor display
    document.querySelector('#keep-head').textContent = `Keep: ${parseInt(localStorage.keep, 10)}`;
    document.querySelector('#trade-head').textContent = `Trade: ${parseInt(localStorage.trade, 10)}`;
    document.querySelector('#sell-head').textContent = `Sell: ${parseInt(localStorage.sell, 10)}`;
};

const purchaseShares = (e, sock) => {
    // Generate purchase from localStorage cart
    let purchase = {};
    chains.forEach((chain) => {
        if(localStorage[`${chain}InCart`] !== '0'){
            purchase[chain] = parseInt(localStorage[`${chain}InCart`], 10);
        }
    });
    console.log(purchase);
    const endGame = document.querySelector('#end-game-selection').checked;
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'purchaseShares', updateData: {'endGame': endGame, 'purchase': purchase}});
    chains.forEach((chain) => localStorage.setItem(`${chain}InCart`, "0")); // Reset cart to 0's
    localStorage.purchaseTotal = 0;
    document.querySelectorAll(".cart-share").forEach((cartShare) => cartShare.remove());
    document.querySelector("#buy-shares-container").style.display = 'none';
    chains.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'none');
};
const disposeShares = (e, sock) => {
    const shareDisposal = {'keep': parseInt(localStorage.keep, 10), 'trade': parseInt(localStorage.trade, 10), 'sell': parseInt(localStorage.sell, 10)};
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'disposeShares', updateData: shareDisposal});
    document.querySelector("#dispose-shares-container").style.display = 'none';
};

const startGame = (sock) => (e) => {
    e.preventDefault();
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'startGame', updateData: {}});
    document.querySelector("#start-game-button").style.display = 'none';
};

const populateGame = (sock) => (game) => {
    localStorage.setItem('gameState', JSON.stringify(game.state));
    chains.forEach((chain) => localStorage.setItem(`${chain}InCart`, "0"));
    generateStatsTable(game);
    updateGameBoard(game);
    if(!game.state.game_started && game.usernames[0] === localStorage.username){
        document.querySelector('#start-game-button').style.display = 'block';
    }
    if(game.state.game_started){
        updateTileBank(game, sock);
        myTurnStateUpdater(game);
    }
    //TODO: Reveal hidden elements if necessary (dispose-shares-table).
    // Normally this state is updated on updateGame calls, but we should update in the same way on page load.
    // updateClientState(game.state.expectedNextAction, game.state.turn)

    //TODO: Think about what we have in local storage. How will that affect switching between games?
};

const prepareToPurchaseShares = (game) => {
    /**
     * To be called whenever we are expecting this user to purchase shares.
     * Puts UI and localStorage variables in correct state for share purchace interaction.
     */
     document.querySelector("#buy-shares-container").style.display = 'flex';
     localStorage.purchaseTotal = 0;
     document.querySelector('#share-purchase-total').textContent = 'Total: 0';
     updateChainSelectorRow(game.state);
};

const prepareToDisposeShares = (game) => {
     /**
     * To be called whenever we are expecting this user to dispose shares.
     * Puts UI and localStorage variables in correct state for share disposal interaction.
     */
      document.querySelector("#dispose-shares-container").style.display = 'flex';
      let state = game.state;
      let disposingChain = state.active_merger.elim_chains[state.active_merger.disposing_chain_index];
      localStorage.setItem('disposingChain', disposingChain);
      localStorage.setItem('keep', state.player_states[state.turn][disposingChain]);
      localStorage.setItem('trade', '0');
      localStorage.setItem('sell', '0');

      // Update disposal editor display
      document.querySelector('#keep-head').textContent = `Keep: ${parseInt(localStorage.keep, 10)}`;
      document.querySelector('#trade-head').textContent = `Trade: ${parseInt(localStorage.trade, 10)}`;
      document.querySelector('#sell-head').textContent = `Sell: ${parseInt(localStorage.sell, 10)}`;

      localStorage.setItem('maxSharesToDispose', state.player_states[state.turn][disposingChain]);
      let remainingChain = state.active_merger.remaining_chain;
      localStorage.setItem('remainingChain', remainingChain);
      localStorage.setItem('maxSharesToTradeFor', state.bank_shares[remainingChain]);
};

const myTurnStateUpdater = (game) => {
    /**
     * If it is this user's turn, updates client state based on expected next action.
     */
    if(game.usernames[game.state.turn] === localStorage.username){
        if(game.state.expectedNextAction === 'disposeShares'){
            prepareToDisposeShares(game);
        }
        else if(game.state.expectedNextAction === 'purchaseShares'){
            prepareToPurchaseShares(game);
        }
        else if(['chooseNewChain', 'chooseRemainingChain'].includes(game.state.expectedNextAction)){
            updateChainSelectorRow(game.state);
        }
    }
};

const updateGame = (sock) => (gameUpdate) => {
    if(['playTile', 'chooseNewChain', 'chooseRemainingChain', 'disposeShares', 'purchaseShares', 'startGame'].includes(gameUpdate.type)){
        localStorage.setItem('gameState', JSON.stringify(gameUpdate.game.state));
        localStorage.setItem('expected_next_action', gameUpdate.game.state.expectedNextAction);
        updateStatsTable(gameUpdate.game); // Specialized function to only update a part of the table would be faster.
        updateGameBoard(gameUpdate.game);
        updateTileBank(gameUpdate.game, sock);
        myTurnStateUpdater(gameUpdate.game);
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
    else if(gameUpdate.type === 'startGame'){
        updateGameBoard();
        updateStatsTable();
        updateTileBank(gameUpdate.game, sock);
    }
    else {
        console.log("Got unrecognized game update...")
    }
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
        document.querySelector(`[row="${i}"][column="username"]`).innerHTML = game.usernames[i];
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
    sock.on('gameResponse', populateGame(sock));
    sock.on('gameUpdate', updateGame(sock));
    
    document.querySelectorAll('.game-board td')
    .forEach(e => e.addEventListener('click', function() {tileClickHandler(e, sock);}));

    document.querySelectorAll('#chain-selector-row span')
    .forEach(e => e.addEventListener('click', function() {chainSelectHandler(e, sock);}));

    document.querySelectorAll('#dispose-shares-button')
    .forEach(e => e.addEventListener('click', function() {disposeShares(e, sock);}));

    document.querySelectorAll('#buy-shares-button')
    .forEach(e => e.addEventListener('click', function() {purchaseShares(e, sock);}));

    document.querySelectorAll('#dispose-shares-button-row td')
    .forEach(e => e.addEventListener('click', function() {disposeSharesEditor(e);}));
    
    document
    .querySelector('#start-game-button')
    .addEventListener('click', startGame(sock));

    document
    .querySelector('#chat-form')
    .addEventListener('submit', onChatSubmitted(sock));

    //canvas.addEventListener('click', onClick);
    sock.emit('gameRequest', window.location.href.split("gameid=").at(-1));

})();