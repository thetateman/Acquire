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


const getBoard = (canvas, numCells = 20) => {
    const ctx = canvas.getContext('2d');
    const cellSize = (canvas.width/12);

    const fillCell = (x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x*cellSize, y*cellSize, cellSize, cellSize);
    };


    const drawGrid = () => {
        ctx.beginPath();
        for(let i = 0; i <= 13; i++) {
            ctx.moveTo(i*cellSize, 0);
            ctx.lineTo(i*cellSize, cellSize*numCells);
        }

        for(let j = 0; j <= 9; j++) {
            ctx.moveTo(0, j*cellSize);
            ctx.lineTo(cellSize*numCells,  j*cellSize);
        }
       
        ctx.stroke();
    };

    const clear = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const reset = () => {
        clear();
        drawGrid();
    };

    const getCellCoordinates = (x, y) => {
        return {
            x: Math.floor(x/cellSize),
            y: Math.floor(y/cellSize)
        };
    };
    return { fillCell, reset, getCellCoordinates };
};

const getClickCoordinates = (element, ev) => {
    const { top, left } = element.getBoundingClientRect();
    const { clientX, clientY } = ev;

    return {
        x: clientX - left,
        y: clientY - top
    };
};

(() => {
    const canvas = document.querySelector('canvas');
    const { fillCell, reset, getCellCoordinates } = getBoard(canvas);

    reset();

    const sock = io();

    const onClick = (e) => {
        const { x, y } = getClickCoordinates(canvas, e);
        sock.emit('turn', getCellCoordinates(x, y));
    };
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

    sock.on('message', log);
    sock.on('turn', ({ x, y, color}) => fillCell(x, y, color));
    document
    .querySelector('#chat-form')
    .addEventListener('submit', onChatSubmitted(sock));

    document
    .querySelector('#logout-button')
    .addEventListener('click', logout);

    canvas.addEventListener('click', onClick);
})();