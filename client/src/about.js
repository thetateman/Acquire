(() => {
    const sock = io('/', { forceNew: true });
    window.active_socket_conn = sock;
})();
