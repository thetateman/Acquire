(() => {
    const sock = io('/', {transports: ['websocket']});
    window.active_socket_conn = sock;
})();
