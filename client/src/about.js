(() => {
    const sock = io();
    window.active_socket_conn = sock;

    sock.on('disconnect', () => {
        // Handle disconnect event
        sock = io();
        window.active_socket_conn = sock;
    });
})();
