const chains = ['i', 'c', 'w', 'f', 'a', 't', 'l'];

const log = (text) => {
    const parent = document.querySelector('#messages');
    const el = document.createElement('li');
    el.textContent = text;

    parent.appendChild(el);
    parent.scrollTop = parent.scrollHeight;
};

const onChatSubmitted = (sock) => (e) => {
    e.preventDefault();

    const input = document.querySelector('#chat-input');
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
    // Color my tiles
    game.state.player_states[game.usernames.indexOf(localStorage.username)].tiles
    .forEach((tile) => {
        let tileSlot = document.querySelector(`[x="${tile.x}"][y="${tile.y}"]`);
        tileSlot.style['background-color'] = 'var(--tile-bank-single-color)';
        tileSlot.style['border-color'] = '#adad72'; // This color looks best for dark and light modes.
    });
};

const updateTileBank = (game, sock) => {
    // First find adjacent single tiles
    let tiles = game.state.player_states[game.usernames.indexOf(localStorage.username)].tiles;
    if(game.state.available_chains.length > 0){
        let singleTiles = tiles.filter((tile) => tile.predicted_type === 's');
        singleTiles.forEach((singleTile) => {
            if(singleTiles.some((tile) => {
                return (tile.x === singleTile.x && tile.y === singleTile.y + 1) ||
                (tile.x === singleTile.x && tile.y === singleTile.y - 1) ||
                (tile.x === singleTile.x + 1 && tile.y === singleTile.y) ||
                (tile.x === singleTile.x - 1 && tile.y === singleTile.y);
                })
            ){
                singleTile.predicted_type = 'j';
            }
        });
    }
    document.querySelector('#tile-bank').innerHTML = "";
    tiles.forEach((tile) => {
        let tileHTML = `<span x="${tile.x}" y="${tile.y}" type="${tile.predicted_type}">${tile.x+1}${String.fromCharCode(tile.y+65)}</span>`;
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
        document.querySelector('#chain-selector-label').textContent = 'Buy:';
    } else if(gameState.expectedNextAction === 'chooseNewChain'){
        chains.forEach((chain) => {
            if(gameState.available_chains.includes(chain)){
                visibleChainSelectors.push(chain);
            }
        });
        document.querySelector('#chain-selector-label').textContent = 'New Chain:';
    } else if(gameState.expectedNextAction === 'chooseRemainingChain'){
        chains.forEach((chain) => {
            if(gameState.active_merger.largest_chains.includes(chain)){
                visibleChainSelectors.push(chain);
            }
        });
        document.querySelector('#chain-selector-label').textContent = 'Remaining Chain:';
    } else if(gameState.expectedNextAction === 'chooseNextElimChain'){
        let elimChainOptionGroupIndex = -1;
        for(let i=0;i<gameState.active_merger.elim_chains_ranked.length;i++){
            if(gameState.active_merger.elim_chains_ranked[i].includes(gameState.active_merger.elim_chains[gameState.active_merger.disposing_chain_index])){
                visibleChainSelectors = visibleChainSelectors.concat(gameState.active_merger.elim_chains_ranked[i]);
                break;
            }
        }
        document.querySelector('#chain-selector-label').textContent = 'Eliminate Next:';
    } else { // Not a state where we want to display chain selectors.
        console.log('HMMMM, check on this.');
        return false;
    }
    visibleChainSelectors.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'inline-flex');
    document.querySelector('#chain-selector-row-container').style.display = 'flex';
}

const updateTile = (x, y, tileType) => {
    let tile = document.querySelector(`[x="${x}"][y="${y}"]`);
    tile.style["background-color"] = `var(--${tileType}-color)`;
    tile.style["border-color"] = `var(--${tileType}-color)`;
    tile.style["border-style"] = "outset";
    tile.style["color"] = "black";
    if(tileType === 's'){
        tile.style["color"] = "white";
        tile.style["border-color"] = "var(--single-tile-border-color)";
    }
};

const tileClickHandler = (e, sock) => {
    //TODO: only send allowed websocket message on legal tile click
    console.log(`clicked x:${e.getAttribute('x')} y:${e.getAttribute('y')}`);
    sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'playTile', updateData: {x: parseInt(e.getAttribute('x'), 10), y: parseInt(e.getAttribute('y'), 10)}})
};

const cartShareClickHandler = (IDnum, chainSelection, currentGameState) => () => {
    localStorage[`${chainSelection}InCart`]--;
    localStorage.purchaseTotal = parseInt(localStorage.purchaseTotal, 10) - currentGameState.share_prices[chainSelection];
    document.querySelector('#share-purchase-total').textContent = `Total: ${localStorage.purchaseTotal}`;
    updateChainSelectorRow(currentGameState);
    document.querySelector(`#share-cart span[number="${IDnum}`).remove();
}

const chainSelectHandler = (e, sock) => {
    const chainSelection = e.id.charAt(0);
    const currentGameState = JSON.parse(localStorage.gameState);
    //different behavior depending on next expected action
    if(localStorage.getItem('expected_next_action') === 'chooseNewChain'){
        sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'chooseNewChain', updateData: {newChainChoice: chainSelection}});
        chains.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'none');
        document.querySelector('#chain-selector-row-container').style.display = 'none';
    }
    else if(localStorage.getItem('expected_next_action') === 'purchaseShares'){
        let numSharesInCart = 0;
        chains.forEach((chain) => numSharesInCart+=parseInt(localStorage[`${chain}InCart`], 10));
        if(numSharesInCart >= 3){
            console.log("You may buy a maximum of 3 shares.");
        }
        else{
            localStorage[`${chainSelection}InCart`]++;
            localStorage.currentCartShareID++;
            localStorage.purchaseTotal = parseInt(localStorage.purchaseTotal, 10) + currentGameState.share_prices[chainSelection];
            document.querySelector('#share-purchase-total').textContent = `Total: ${localStorage.purchaseTotal}`;
            let cartShare = 
                `<span class="cart-share" id="${chainSelection}-cart-share" number="${localStorage.currentCartShareID}" style="background-color:var(--${chainSelection}-color)">
                ${JSON.parse(localStorage.gameState).share_prices[chainSelection]}</span>`;
            document.querySelector('#share-cart').insertAdjacentHTML('beforeend', cartShare);
            document.querySelector(`#share-cart span[number="${localStorage.currentCartShareID}`).addEventListener('click', cartShareClickHandler(localStorage.currentCartShareID, chainSelection, currentGameState));
            updateChainSelectorRow(currentGameState);
        }
    }
    else if(localStorage.getItem('expected_next_action') === 'chooseRemainingChain'){
        sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'chooseRemainingChain', updateData: {remainingChainChoice: chainSelection}});
        chains.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'none');
        document.querySelector('#chain-selector-row-container').style.display = 'none';
    }
    else if(localStorage.getItem('expected_next_action') === 'chooseNextElimChain'){
        sock.emit('gameAction', {game_id: localStorage.getItem('current_game_id'), updateType: 'chooseNextElimChain', updateData: {nextElimChain: chainSelection}});
        chains.forEach((chain) => document.querySelector(`#${chain}button`).style.display = 'none');
        document.querySelector('#chain-selector-row-container').style.display = 'none';
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
            else if(parseInt(localStorage.keep, 10) === 1 && parseInt(localStorage.sell, 10) === 1){
                localStorage.keep = parseInt(localStorage.keep, 10) - 1;
                localStorage.sell = parseInt(localStorage.sell, 10) - 1;
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
    document.querySelector('#chain-selector-row-container').style.display = 'none';
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
        statsTableUsernameStyleUpdater(game);
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
     localStorage.purchaseTotal = 0;
     localStorage.currentCartShareID = 0;
     document.querySelector("#buy-shares-container").style.display = 'flex';
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

const statsTableUsernameStyleUpdater = (game) => {
    document.querySelectorAll(`.stats-board td[column="username"]`).forEach((nameElement) => {
        let playerID = nameElement.getAttribute('row');
        if(game.state.game_ended){
            if(game.places[0].includes(game.usernames[playerID])){
                nameElement.style['background-color'] = 'gold';
            }
            else {
                nameElement.style['background-color'] = 'lightgray';
            }
        }
        else{
            if(playerID == game.state.turn){
                nameElement.style['background-color'] = 'palegreen';
            }
            else {
                nameElement.style['background-color'] = 'lightgray';
            }
        }
    });
}

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
        else if(['chooseNewChain', 'chooseRemainingChain', 'chooseNextElimChain'].includes(game.state.expectedNextAction)){
            updateChainSelectorRow(game.state);
        }
    }
};

const updateGame = (sock) => (gameUpdate) => {
    if(gameUpdate.hasOwnProperty('error')){
        /**
         * Game did not successfully update upon an action attempted by this player. Game state on server should
         * be unchanged. No other players are notified of the action or it's error status. The server sent this
         * message to reset this player's UI components to their state prior to the unaccepted action.
         */
        console.error(`Failed to update game because: ${gameUpdate.error}`);
        localStorage.setItem('gameState', JSON.stringify(gameUpdate.game.state));
        localStorage.setItem('expected_next_action', gameUpdate.game.state.expectedNextAction);
        myTurnStateUpdater(gameUpdate.game);
        return false;
    }
    if(['playTile', 'chooseNewChain', 'chooseRemainingChain', 'disposeShares', 'purchaseShares', 'startGame', 'chooseNextElimChain'].includes(gameUpdate.type)){
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
            
            // Shrink height of chat based on additional player row height
            let playerRowsHeight = (i + 1) * 1.85;
            document.querySelector('.chain-chat-action-container').style.height = `${27 - playerRowsHeight}vw`;
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

    // Shrink height of chat based on additional player row height
    let playerRowsHeight = game.num_players * 1.85;
    document.querySelector('.chain-chat-action-container').style.height = `${27 - playerRowsHeight}vw`;

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
    statsTableUsernameStyleUpdater(game);
};

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

    document.querySelectorAll('.dispose-shares-type-container button')
    .forEach(e => e.addEventListener('click', function() {disposeSharesEditor(e);}));
    
    document
    .querySelector('#start-game-button')
    .addEventListener('click', startGame(sock));

    document
    .querySelector('#chat-form')
    .addEventListener('submit', onChatSubmitted(sock));

    //canvas.addEventListener('click', onClick);
    sock.emit('gameRequest', window.location.href.split("gameid=")[window.location.href.split("gameid=").length - 1]);

})();