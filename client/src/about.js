(() => {
    const sock = io();
    window.active_socket_conn = sock;

    sock.on("disconnect", (reason) => {
        location.reload();
    });
})();
