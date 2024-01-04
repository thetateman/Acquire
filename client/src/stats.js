const displayError = (err) => {
    if(err === 'userNotFound'){
        let errorMessage = `<p class="error">Could not find that username :(</p>`;
        document.body.insertAdjacentHTML("beforeend", errorMessage);
    }
    else if(err === 'gamesNotFound'){
        let errorMessage = `<p class="error">This user hasn't played any games yet.</p>`;
        document.body.insertAdjacentHTML("beforeend", errorMessage);
    }
    
    if(err !== 'none'){
        return false;
    }
    return true;
}

const getLadder = (numPlayers) => (e) => {
    e.preventDefault();

    // Remove old html
    document.querySelectorAll('.stats-table').forEach(table => table.remove());
    document.querySelectorAll('.error').forEach(error => error.remove());

    // Request player Ladder
    fetch(`/api/getLadder?numplayers=${numPlayers}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        })
        .then(function(response){
            response.json().then(function(json){
                let success = displayError(json.error);
                console.log('Success:', json);
                if(success){
                    console.log(json.users);
                    let userRows = '';
                    let users = json.users;
                    users.forEach((user) => {
                        if(!user.hasOwnProperty(`p${numPlayers}_skill`)){
                            user[`p${numPlayers}_skill`] = [25.0, 25.0/3.0];
                        }
                        if(!user.hasOwnProperty(`p${numPlayers}games_stalled`)){
                            user[`p${numPlayers}games_stalled`] = 0;
                        }
                        if(!user.hasOwnProperty('date_created')){
                            user.date_created = '0000-00-00';
                        }
                    });
                    //sort users on rating (mu - 3*sigma)
                    /*
                    users.sort((a, b) => {
                        if(a[`p${numPlayers}_skill`][0] - 3*a[`p${numPlayers}_skill`][1] < b[`p${numPlayers}_skill`][0] - 3*b[`p${numPlayers}_skill`][1]){
                            return 1;
                        }
                        else {
                            return -1
                        }
                    });
                    */
                    for(let i = 0; i < users.length; i++){
                        let record = users[i][`p${numPlayers}_record`];
                        let recordSum = record.reduce((partialSum, a) => partialSum + a, 0);
                        let recordText = '';
                        for(let j = 0; j < record.length; j++){
                            if(j !== 0){
                                recordText += '-';
                            }
                            recordText += record[j].toString();
                        }

                        let games_stalled = users[i][`p${numPlayers}games_stalled`];
                        let games_stalled_percent = Math.round(10000*(games_stalled/recordSum))/100;

                        let mu = users[i][`p${numPlayers}_skill`][0];
                        let muRounded = Math.round(100*mu)/100;
                        let sigma = users[i][`p${numPlayers}_skill`][1];
                        let rating = mu - 3 * sigma;
                        let ratingRounded = Math.round(100*rating)/100;
                        let ratingRangeRounded = Math.round(100*3*sigma)/100;
                        userRows += (`
                            <tr>
                                <td>${i+1}</td>
                                <td>${users[i].username}</td>
                                <td>${ratingRounded}</td>
                                <td>${muRounded} ± ${ratingRangeRounded}</td>
                                <td>${recordSum}</td>
                                <td>${recordText}</td>
                                <td>${games_stalled}</td>
                                <td>${games_stalled_percent}%</td>
                                <td>${users[i].date_created.substring(0,10)}</td>
                            </tr>
                        `);
                    }
                    const statsTable = (`
                    <table id="stats-table" class="stats-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Username</th> 
                                <th>Rating</th>
                                <th>Rating Range</th>
                                <th># Games</th>
                                <th>Record</th>
                                <th># Games Stalled</th>
                                <th>% Games Stalled</th>
                                <th>Account Created</th> 
                            </tr> 
                    </thead> 
                    <tbody>${userRows}</tbody>
                    `);
                    document.body.insertAdjacentHTML("beforeend", statsTable);
                }
                
            })
            .catch((error) => {
                console.error('Got response, but had issue processing it: ', error);
            })
        })
        .catch((error) => {
        console.error('Error:', error);
    });
    //do stuff after search, before response
}

const onSearch = (e) => {
    e.preventDefault();

    // Remove old html
    document.querySelectorAll('.stats-table').forEach(table => table.remove());
    document.querySelectorAll('.error').forEach(error => error.remove());
    
    let usernameToSearch = document.querySelector('#search-username').value;
    fetch(`/api/searchUser?username=${usernameToSearch}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        })
        .then(function(response){
            response.json().then(function(json){
                let success = displayError(json.error);
                console.log('Success:', json);
                if(success){
                    //populate page with results
                    let gameTypeRows = '';
                    for(let i=2; i<7; i++){
                        if(json.user.hasOwnProperty(`p${i}_skill`)){
                            console.log(i);
                            let record = json.user[`p${i}_record`];
                            let recordSum = record.reduce((partialSum, a) => partialSum + a, 0);
                            if(recordSum === 0) continue;
                            let recordText = '';
                            for(let j = 0; j < record.length; j++){
                                if(j !== 0){
                                    recordText += '-';
                                }
                                recordText += record[j].toString();
                            }
                            
                            let games_stalled = json.user[`p${i}games_stalled`];
                            let games_stalled_percent = Math.round(10000*(games_stalled/recordSum))/100;

                            let mu = json.user[`p${i}_skill`][0];
                            let muRounded = Math.round(100*mu)/100;
                            let sigma = json.user[`p${i}_skill`][1];
                            let rating = mu - 3 * sigma;
                            let ratingRounded = Math.round(100*rating)/100;
                            let ratingRangeRounded = Math.round(100*3*sigma)/100;
                            
                            gameTypeRows += (`
                            <tr>
                                <td>${i}</td>
                                <td>${ratingRounded}</td>
                                <td>${muRounded} ± ${ratingRangeRounded}</td>
                                <td>${recordSum}</td>
                                <td>${recordText}</td>
                                <td>${games_stalled}</td>
                                <td>${games_stalled_percent}%</td>
                                <td>${json.user.date_created.substring(0,10)}</td>
                            </tr>
                            `);
                        }
                    }
                    const statsTable = (`
                    <table id="stats-table" class="stats-table">
                        <thead>
                            <tr>
                                <th># Players</th>
                                <th>Rating</th> 
                                <th>Rating Range</th>
                                <th># Games</th>
                                <th>Record</th>
                                <th># Games Stalled</th>
                                <th>% Games Stalled</th>
                                <th>Account Created</th> 
                            </tr> 
                    </thead> 
                    <tbody>${gameTypeRows}</tbody>
                    `);
                    document.getElementById('stats-tables-container').insertAdjacentHTML("afterbegin", statsTable);
                    
                    let gameTables = '';
                    if(json.games.length > 0){
                        json.games.forEach((game) => {
                            if(game.history.length > 0){
                                let userRows = '';
                                for(let i = 0; i < game.usernames.length; i++){
                                    userRows += `<tr><td>${game.usernames[i]}</td><td>${game.networths[i]}</td></tr>`
                                }
                                gameTables += (`
                                    <table class="game-table stats-table">
                                    <thead>
                                        <tr>
                                            <th>${game.date_created.substring(0,10)}</th> 
                                            <th><a href="/history?gameid=${game._id}"><button>Review</button></a></th>
                                        </tr> 
                                    </thead> 
                                    <tbody>
                                    ${userRows}
                                    </tbody>
                                    </table>
                            `);
                            }
                            
                        })
                        document.getElementById('game-tables-container').insertAdjacentHTML("afterbegin", gameTables);
                    }
                    else{
                        let errorMessage = `<p class="error">This user hasn't played any games yet.</p>`;
                        document.body.insertAdjacentHTML("beforeend", errorMessage);
                    }
                    

                }
            })
            .catch((error) => {
                console.error('Got response, but had issue processing it: ', error);
            })
        })
        .catch((error) => {
        console.error('Error:', error);
    });
    //do stuff after search, before response
}

(() => {
    const sock = io('/', { forceNew: true });
    window.active_socket_conn = sock;
    document.querySelector('#search-form').addEventListener('submit', onSearch);
    document.querySelectorAll('.game-type-selector')
    .forEach((button) => {
        button.addEventListener('click', getLadder(button.value))
    });
})();
