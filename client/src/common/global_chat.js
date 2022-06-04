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

(() => {
    const sock = window.active_socket_conn;
    sock.on('message', log);
    
    document
    .querySelector('#chat-form')
    .addEventListener('submit', onChatSubmitted(sock));
})();