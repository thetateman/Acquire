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
    document.querySelector("#game-board").insertAdjacentHTML("beforeend", spaces);
};

const updateTile = (x, y, color) => {
    let tile = document.querySelector(`[x="${x}"][y="${y}"]`);
    console.log(tile);
    tile.style["background-color"] = color;
    tile.style["border-color"] = color;
    tile.style["border-style"] = "outset";
};

(() => {
    const sock = io();
    addBoard();
    sock.on('message', log);
    sock.on('gameResponse', game => console.log(game)); //TODO: populate game with this.
    sock.on('turn', ({ x, y, color}) => updateTile(x, y, color));
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

    const tileClickHandler = (e) => {
        console.log(`clicked x:${e.getAttribute('x')} y:${e.getAttribute('y')}`);
        sock.emit('turn', {x: parseInt(e.getAttribute('x'), 10), y: parseInt(e.getAttribute('y'), 10)});
    }

    document.querySelectorAll('#game-board td')
    .forEach(e => e.addEventListener('click', function() {tileClickHandler(e);}));
    
    
    document
    .querySelector('#chat-form')
    .addEventListener('submit', onChatSubmitted(sock));

    document
    .querySelector('#logout-button')
    .addEventListener('click', logout);

    //canvas.addEventListener('click', onClick);
    sock.emit('gameRequest', window.location.href.split("gameid=").at(-1));

})();