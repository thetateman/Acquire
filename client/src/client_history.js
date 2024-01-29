"use strict";
const chains = ['l', 't', 'a', 'f', 'w', 'c', 'i',];

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
    game.state.drawnDeadTiles.forEach((deadTile) => {
        game.state.board[deadTile.y][deadTile.x] = 'p';
    });
    for(let x=0; x<12; x++){
        for(let y=0; y<9; y++){
            if(game.state.board[y][x] !== 'e'){
                updateTile(x, y, game.state.board[y][x]);
            }
        }
    }
    // Color my tiles
    if(game.usernames.indexOf(localStorage.username) === -1){
        return 'userNotInGame';
    }
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
};

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


const populateGame = (sock, games) => (data) => {
    let matchingGame = data.game;
    let gameID = internalGameFunctions.createGame(games, matchingGame.usernames.length, matchingGame.time_per_player/(1000*60), matchingGame.usernames_original_order[0], 
        {id: matchingGame._id, history: matchingGame.history, original_tile_bank: matchingGame.tile_bank, usernames_original_order: matchingGame.usernames_original_order});
    let game = games[gameID];
    internalGameFunctions.updateGame(game, matchingGame.usernames_original_order[0], 'startGame', {});
    window.gameHistory = game.history
    window.game = game;
    window.localStateHistory = [JSON.parse(JSON.stringify(game.state))];
    window.gameGlobals.gameState = JSON.stringify(game.state);
    chains.forEach((chain) => window.gameGlobals[`${chain}InCart`] = "0");
    generateStatsTable(game);
    updateGameBoard(game);
    if(!game.state.game_started && game.usernames[0] === localStorage.username){
        document.querySelector('#start-game-button').style.display = 'block';
    }
    if(game.state.game_started){
        if(game.usernames.indexOf(localStorage.username) !== -1){ //if user is a player in this game
            updateTileBank(game, sock);
        }
        statsTableUsernameStyleUpdater(game);
    }
    announceGame(game);
    //TODO: Reveal hidden elements if necessary (dispose-shares-table).
    // Normally this state is updated on updateGame calls, but we should update in the same way on page load.
    // updateClientState(game.state.expectedNextAction, game.state.turn)

    //TODO: Think about what we have in local storage. How will that affect switching between games?
};

const gameIsEndable = (game) => {
    if(Object.values(game.state.chains).some((chain) => chain.length > 40) ||
        (!Object.values(game.state.chains).some((chain) => chain.length > 0 && chain.length < 11)
            && game.state.available_chains.length < 7))
    {
        return true;
    }
    else {
        return false;
    }
};

const updateGame = (sock) => (gameUpdate, back=false) => {
    if(gameUpdate.hasOwnProperty('error')){
        /**
         * Game did not successfully update upon an action attempted by this player. Game state on server should
         * be unchanged. No other players are notified of the action or it's error status. The server sent this
         * message to reset this player's UI components to their state prior to the unaccepted action.
         */
        console.error(`Failed to update game because: ${gameUpdate.error}`);
        window.gameGlobals.gameState = JSON.stringify(gameUpdate.game.state);
        window.gameGlobals.expected_next_action = gameUpdate.game.state.expectedNextAction;
        return false;
    }
    if(['playTile', 'chooseNewChain', 'chooseRemainingChain', 'disposeShares', 'purchaseShares', 'startGame', 'chooseNextElimChain'].includes(gameUpdate.type)){
        if(gameUpdate.type === 'disposeShares'){
            window.gameGlobals.lastMerger = JSON.stringify(JSON.parse(window.gameGlobals.gameState).active_merger);
        }
        window.gameGlobals.gameState = JSON.stringify(gameUpdate.game.state);
        window.gameGlobals.expected_next_action = gameUpdate.game.state.expectedNextAction;
        updateStatsTable(gameUpdate.game); // Specialized function to only update a part of the table would be faster.
        updateGameBoard(gameUpdate.game);
        if(gameUpdate.game.usernames.indexOf(localStorage.username) !== -1){ //if user is a player in this game
            updateTileBank(gameUpdate.game, sock);
        }
    } 
    else {
        console.log("Got unrecognized game update...")
    }
    if(!back) postGameMessage(gameUpdate);
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

const generateStatsTable = (game) => {
    
    let playerRows = ""; // Populate player data: usernames, time remaining, chains, cash.
    let totalSecondsRemainingArr = [];
    for(let i=0; i<game.num_players; i++){
        let username = game.usernames[i];
        // calculate total time remaining
        let playerState = game.state.player_states[i];
        let totalSecondsRemaining;
        if(playerState.total_time_remaining === null){
            totalSecondsRemaining = game.time_per_player / 1000;
        }
        else{
            totalSecondsRemaining = playerState.total_time_remaining / 1000;
        }
        totalSecondsRemainingArr.push(totalSecondsRemaining);
        let timerColor;
        if(totalSecondsRemaining < 30){
            timerColor = 'red';
        }
        else{
            timerColor = 'black';
        }
        let chainData = "";
        // build player data row, setting row and column attributes for easy access when updating.
        chains.forEach((chain) => {chainData += `<td row="${i}" column="${chain}">${playerState[chain]}</td>`});
        playerRows += `<tr><td row="${i}" column="username"><span class="username">${game.usernames[i]}</span><span class="total-time" style="color:${timerColor}">${getReadableTimer(totalSecondsRemaining)}</span></td>`
        + chainData +
        `<td row="${i}" column="cash">${playerState['cash']}</td>` +
        `<td row="${i}" column="net">${playerState['net_worth']}</td></tr>`;
        
    }
    document.querySelector("#stats-table-header-row").insertAdjacentHTML("afterend", playerRows);

    // Shrink height of chat based on additional player row height
    // let playerRowsHeight = game.num_players * 1.85;
    // document.querySelector('.chain-chat-action-container').style.height = `${27 - playerRowsHeight}vw`;

    // Build and add the table rows for misc stats
    let bankShareRow = "<td>Bank Shares</td>";
    chains.forEach((chain) => {bankShareRow += `<td row="bank-shares" column="${chain}">${game.state.bank_shares[chain]}</td>`});
    let chainSizeRow = "<td>Chain Size</td>";
    chains.forEach((chain) => {chainSizeRow += `<td row="chain-size" column="${chain}">${game.state.chains[chain].length}</td>`});
    let priceRow = "<td>Price</td>";
    chains.forEach((chain) => {priceRow += `<td row="price" column="${chain}">${game.state.share_prices[chain]}</td>`});
    let miscStats = "<tr>" + bankShareRow + "</tr><tr>" + chainSizeRow + "</tr><tr>" + priceRow + "</tr>";

    document.querySelector("#stats-placeholder-row-parent").insertAdjacentHTML("afterend", miscStats);

    chains.forEach((chain)=>{
        if(game.state.chains[chain].length > 10){
            document.querySelectorAll(`td[column=${chain}]`).forEach(element => {element.style['font-style'] = 'italic'})
        }
    })

    addTimers(game);
};

const updateStatsTable = (game) => {
    let totalSecondsRemainingArr = [];
    for(let i=0; i<game.num_players; i++){
        //calculate time remaining
        let totalSecondsRemaining;
        if(game.state.player_states[i].total_time_remaining === null){
            totalSecondsRemaining = Math.floor(game.time_per_player / 1000);
        }
        else{
            totalSecondsRemaining = Math.floor(game.state.player_states[i].total_time_remaining / 1000);
        }
        totalSecondsRemainingArr.push(totalSecondsRemaining);
        //update the elements
        document.querySelector(`[row="${i}"][column="username"]`).innerHTML = `<span class="username">${game.usernames[i]}</span><span class="total-time">${getReadableTimer(totalSecondsRemaining)}</span>`;
        if(totalSecondsRemaining < 30){
            document.querySelector(`[row="${i}"][column="username"] .total-time`).style.color = 'red';
        }
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

    chains.forEach((chain)=>{
        if(game.state.chains[chain].length > 10){
            document.querySelectorAll(`td[column=${chain}]`).forEach(element => {element.style['font-style'] = 'italic'})
        }
    })
    
    addTimers(game);
    statsTableUsernameStyleUpdater(game);
};

const getReadableTimer = (totalSeconds) => {
    if((totalSeconds / 60) > 25000){ // no limit
        return '';
    }
    else if(totalSeconds < 0){
        return('(0:00)');
    }
    let seconds = Math.floor((totalSeconds) % 60);
    if(seconds.toString().length === 1){
        seconds =  `0${seconds}`;
    }
    let minutes = Math.floor((totalSeconds) / 60) % 60;
    let hours = Math.floor((totalSeconds) / 3600);
    let readableTimer = '';
    if(hours !== 0){
        readableTimer += hours + ':';
        if(minutes.toString().length === 1){
            minutes = `0${minutes}`;
        }
    }
    readableTimer += minutes + ':' + seconds;
    return '(' + readableTimer + ')';
};

const addTimers = (game) => {
    if(game.time_per_player === 60 * 30000){
        return;
    }
    let totalSecondsRemainingArr = [];
    if(window.next_move_number === 0 || window.next_move_number === undefined){
        totalSecondsRemainingArr = new Array(game.usernames.length).fill(game.time_per_player);
    } else {
        totalSecondsRemainingArr = window.gameHistory[window.next_move_number - 1][2];
    }
    for(let i = 0; i<game.usernames.length; i++){
        let totalTimerCurrentTurn = document.querySelector(`[row="${i}"][column="username"] .total-time`);
        totalTimerCurrentTurn.innerHTML = '';
        totalTimerCurrentTurn.textContent = `${getReadableTimer(totalSecondsRemainingArr[i]/1000)}`;
    }
};

const postGameMessage = (gameUpdate) => {
    let messageContentSpan = '';
    const chainsToTextMap = {'i': 'Imperial', 'c': 'Continental', 'w': 'Worldwide', 'f': 'Festival', 'a': 'American', 't': 'Tower', 'l': 'Luxor'};
    switch(gameUpdate.type){
        case 'playTile':
            let tileText = `${gameUpdate.game.state.lastPlayedTile.x+1}${String.fromCharCode(gameUpdate.game.state.lastPlayedTile.y+65)}`;
            messageContentSpan = `played tile: ${tileText}.`;
            break;
        case 'chooseNewChain':
            messageContentSpan = `created <span class="chain-label" type="${gameUpdate.game.state.lastActionData.newChainChoice}">${chainsToTextMap[gameUpdate.game.state.lastActionData.newChainChoice]}</span>.`;
            break;
        case 'chooseRemainingChain':
            messageContentSpan = `chose <span class="chain-label" type="${gameUpdate.game.state.lastActionData.remainingChainChoice}">${chainsToTextMap[gameUpdate.game.state.lastActionData.remainingChainChoice]}</span> to remain.`
            break;
        case 'disposeShares':
            let eliminatedChain;
            let remainingChain;
            try{
                eliminatedChain = JSON.parse(window.gameGlobals.lastMerger).elim_chains[JSON.parse(window.gameGlobals.lastMerger).disposing_chain_index];
                remainingChain = JSON.parse(window.gameGlobals.lastMerger).remaining_chain;
            }
            catch(err){
                console.log("Probably missing merger object, did user join in the middle of a merger?");
                console.log(err);
            }
            let remainingChainSpan = `<span class="chain-label" type="${remainingChain}">${chainsToTextMap[remainingChain]}</span>`;
            let eliminatedChainSpan = `<span class="chain-label" type="${eliminatedChain}">${chainsToTextMap[eliminatedChain]}</span>`;
            if(gameUpdate.game.state.lastActionData.keep !== 0){
                messageContentSpan += `kept ${gameUpdate.game.state.lastActionData.keep} ${eliminatedChainSpan}, `
            }
            if(gameUpdate.game.state.lastActionData.trade !== 0){
                messageContentSpan += `traded ${gameUpdate.game.state.lastActionData.trade} ${eliminatedChainSpan} for ${gameUpdate.game.state.lastActionData.trade / 2} ${remainingChainSpan}, `
            }
            if(gameUpdate.game.state.lastActionData.sell !== 0){
                messageContentSpan += `sold ${gameUpdate.game.state.lastActionData.sell} ${eliminatedChainSpan}, `
            }
            messageContentSpan = messageContentSpan.substring(0, messageContentSpan.length - 2);
            messageContentSpan += '.'
            break;
        case 'chooseNextElimChain':
            messageContentSpan = `chose <span class="chain-label" type="${gameUpdate.game.state.lastActionData.nextElimChain}">${chainsToTextMap[gameUpdate.game.state.lastActionData.nextElimChain]}</span> to eliminate next.`
            break;
        case 'purchaseShares':
            if(Object.keys(gameUpdate.game.state.lastActionData.purchase ?? {}).length === 0){
                messageContentSpan = 'bought nothing.';
            }
            else{
                let nothingFlag = true;
                messageContentSpan = `bought `
                for (const [key, value] of Object.entries(gameUpdate.game.state.lastActionData.purchase)){
                    if(value != 0){
                        messageContentSpan += `${value} <span class="chain-label" type="${key}">${chainsToTextMap[key]}</span>, `;
                        nothingFlag = false;
                    }
                }
                if(nothingFlag){
                    messageContentSpan = 'bought nothing  '
                }
                messageContentSpan = messageContentSpan.substring(0, messageContentSpan.length - 2);
                messageContentSpan += '.'
            }
            break;
        case 'startGame':
            messageContentSpan = 'Game Started.';
            break;
        case 'joinGame':
            messageContentSpan = 'joined the game.'
            break;
        
        

    }//, 'chooseNewChain', 'chooseRemainingChain', 'disposeShares', 'purchaseShares', 'startGame', 'chooseNextElimChain'};

    // generate chat message about game update
    const parent = document.querySelector('#messages');
    let sectionEnd = '';
    let turn;
    let computerFlag;
    let usernameSpan;
    let deadTileFlag = '';
    let bonusMessage = '';
    if(gameUpdate.type === 'startGame'){
        usernameSpan = '';
        sectionEnd = `<fieldset><legend>${gameUpdate.game.usernames[gameUpdate.game.state.turn]}</legend></fieldset>`;
    }
    else if(gameUpdate.type === 'joinGame'){
        usernameSpan = `<span>${gameUpdate.joining_player}</span>`;
    }
    else{
        sectionEnd = '';
        turn = gameUpdate.game.state.lastTurn;
        computerFlag = '';
        deadTileFlag = '';
        if(gameUpdate.game.state.game_ended){
            sectionEnd = `<li><span>${gameUpdate.game.usernames[turn]}</span> ended the game.</li>`;
        }
        if(gameUpdate.game.state.expectedNextAction === 'playTile'){
            sectionEnd = `<fieldset><legend>${gameUpdate.game.usernames[gameUpdate.game.state.turn]}</legend></fieldset>`;
        }
        
        console.log(turn);
        usernameSpan = `<span>${gameUpdate.game.usernames[turn]}</span>`;
        if(gameUpdate.game.state.num_new_dead_tiles > 0 && gameUpdate.game.state.expectedNextAction === 'playTile'){
            let deadTile = gameUpdate.game.state.drawnDeadTiles[gameUpdate.game.state.drawnDeadTiles.length - 1];
            let deadTileText = `${deadTile.x+1}${String.fromCharCode(deadTile.y+65)}`;
            deadTileFlag = `<li>${usernameSpan} drew and replaced dead tile: ${deadTileText}</li>`;
        }
        if(gameUpdate.game.state.lastActionData.awards){
            let sortedChains = [...chains];
            // announce bonuses for smallest chains first, this could be used in end game prize announcements too
            sortedChains.sort((a, b) => {
                if(gameUpdate.game.state.chains[a].length > gameUpdate.game.state.chains[b].length){
                    return 1;
                }
                else if(gameUpdate.game.state.chains[a].length < gameUpdate.game.state.chains[b].length){
                    return -1;
                } 
                else{
                    return 0;
                }
            });

            let awardsByChain = {};
            sortedChains.forEach((chain)=>awardsByChain[chain] = [])
            let awards = gameUpdate.game.state.lastActionData.awards;
            
            for(let player=0;player<awards.length;player++){
                Object.entries(awards[player]).forEach(([chain, amount]) => {
                    awardsByChain[chain].push({player, chain, amount});
                })
            }
            let bonusMessages = [];
            let awardChainIndex = 0;
            Object.values(awardsByChain).forEach((awards)=>{
                let lastAmount = 0;
                bonusMessages.push([]);
                awards.forEach((award)=>{
                    let awardChainSpan = `<span class="chain-label" type="${award.chain}">${chainsToTextMap[award.chain]}</span>`;
                    let newBonusMessage = `<li>${gameUpdate.game.usernames[award.player]} recieved a $${award.amount} prize for ${awardChainSpan}.</li>`;
                    if(award.amount > lastAmount){ // First place announcement should come first.
                        bonusMessages[awardChainIndex].unshift(newBonusMessage);
                    }
                    else{
                        bonusMessages[awardChainIndex].push(newBonusMessage);
                    }
                    lastAmount = award.amount;
                })
                awardChainIndex++;
            })
            bonusMessages.forEach((chain)=>chain.forEach((message)=>bonusMessage+=message));
        }
    }
    if(gameUpdate.type === 'joinGame') return;
    const newMessage = `<li>${usernameSpan} ${messageContentSpan}</li>${bonusMessage}${deadTileFlag}${sectionEnd}`;
    
    parent.insertAdjacentHTML('beforeend', newMessage);
    parent.scrollTop = parent.scrollHeight;

};

const gameListUpdate = (update) => {
    let newMessage;
    console.log(update);
    let usernameSpan = `<span>${update.username}</span>`;
    if(update.action === 'addPlayer'){
        if(update.watcher){
            newMessage = `<li>${usernameSpan} is watching.</li>`;
        }
        else{
            newMessage = `<li>${usernameSpan} joined the game.</li>`;
            let usernameElement;
            document.querySelectorAll('.stats-board [column="username"] .username')
            .forEach((element) => {
                if(element.textContent === update.username){
                    usernameElement = element;
                }
            });
            if(usernameElement){
                if(usernameElement.classList.contains('disconnected')){
                    newMessage = `<li>${usernameSpan} rejoined.</li>`;
                    usernameElement.classList.toggle('disconnected');
                }
            }
        }

    }
    else if(update.action === 'removePlayer' || update.action === 'playerDisconnected'){
        if(update.action === 'playerDisconnected'){ // not watcher
            let usernameElement;
            document.querySelectorAll('.stats-board [column="username"] .username')
            .forEach((element) => {
                if(element.textContent === update.username){
                    usernameElement = element;
                }
            });
            console.log(usernameElement);
            if(usernameElement){
                usernameElement.classList.toggle('disconnected');
            }

        }
        newMessage = `<li>${usernameSpan} left.</li>`;
    }
    else{
        console.log("Shouldn't be here...");
    }
    // generate chat message about game update
    const parent = document.querySelector('#messages');
    parent.insertAdjacentHTML('beforeend', newMessage);
    parent.scrollTop = parent.scrollHeight;
};

const announceGame = (game) => {
    if(document.querySelector('#game-status-message')){
        document.querySelector('#game-status-message').remove();
    }
    let gameStatus = `Use the < and > buttons or the arrow keys on your keyboard to review the game.`;
    const newMessage = `<li id="game-status-message"><b>${gameStatus}</b></li>`;
    const parent = document.querySelector('#messages');
    parent.insertAdjacentHTML('afterbegin', newMessage);
    parent.scrollTop = parent.scrollHeight;
};

const backClickHandler = (sock) => (e) => {
    e.preventDefault();
    if(window.current_move_number <= 0){
        return;
    }
    window.next_move_number = window.current_move_number - 1;
    window.game.state = JSON.parse(JSON.stringify(window.localStateHistory[window.next_move_number]));
    let updateType = window.game.state.expectedNextAction;

    document.querySelector(".game-board").innerHTML = '';
    addBoard();

    updateGame(sock)({game: window.game, type: updateType}, true);
    window.current_move_number--;
    
}
const forwardClickHandler = (sock) => (e) => {
    e.preventDefault();
    if(window.current_move_number >= window.gameHistory.length){
        return;
    }
    let historicalMove = window.gameHistory[window.current_move_number];
    let updateType = window.game.state.expectedNextAction;
    internalGameFunctions.callUpdateGameWithExpectedArgs(window.game, historicalMove[1], {admin: false, computer: false, verbose: false});
    window.next_move_number = window.current_move_number + 1;
    window.localStateHistory[window.next_move_number] = JSON.parse(JSON.stringify(window.game.state));
    updateGame(sock)({game: window.game, type: updateType});
    //sock.emit('historicalGameAction', {game_id: window.current_game_id, updateType: historicalMove[0], updateData: historicalMove[1]});
    window.current_move_number++;

}

const resizeBoard = () => {
    
    let board = document.querySelector('.game-board');
    if(window.innerHeight * 1.25 > window.innerWidth){
        board.style['font-size'] = '1.5vw';
    } else {
        board.style['font-size'] = '2.6vh';
    }
    board.style['max-height'] = "";
    let boardHeight = document.querySelector('.game-board').scrollHeight;
    let boardWidth = boardHeight * (4/3);
    let boardFlexBasis = boardWidth / window.innerWidth;
    if(boardFlexBasis > 0.54){
        boardFlexBasis = 0.54;
    }
    const statsFlexBasis = 1 - boardFlexBasis;
    document.querySelector('.game-column').style['flex-basis'] = `${boardFlexBasis*100}%`;
    document.querySelector('.stats-column').style['flex-basis'] = `${statsFlexBasis*100}%`;
    if(boardFlexBasis === 0.54){
        let board = document.querySelector('.game-board');
        let newHeight = board.scrollWidth * (3/4);
        board.style['max-height'] = `${newHeight}px`;
        board.style['min-height'] = `${newHeight}px`;
    }
};

(() => {
    window.onresize = resizeBoard;
    window.gameGlobals = {};
    const sock = io();
    window.active_socket_conn = sock;

    sock.on("disconnect", (reason) => {
        location.reload();
    });

    window.current_move_number = 0;
    let games = {};

    addBoard();
    resizeBoard();
    sock.on('gameResponse', populateGame(sock, games));
    //sock.on('gameUpdate', updateGame(sock));
    //sock.on('gameListUpdate', gameListUpdate);

    // Force reload when page is accessed with the back button.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          // page was restored from the bfcache
          window.location.reload();
        }
    });

    document.getElementById('back-button').addEventListener("click", backClickHandler(sock));
    document.getElementById('forward-button').addEventListener("click", forwardClickHandler(sock));
    document.addEventListener("keydown", (e)=>{
        if(['>', '.', 'ArrowRight'].includes(e.key)){
            forwardClickHandler(sock)(e);
        }
        else if(['<', ',', 'ArrowLeft'].includes(e.key)){
            backClickHandler(sock)(e);
        }
    });

    let current_game_id = window.location.href.split("gameid=")[window.location.href.split("gameid=").length - 1];
    window.current_game_id = current_game_id;
    sock.emit('gameHistoryRequest', current_game_id);
})();
