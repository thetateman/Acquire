const logout = () => {
    //localStorage.clear();
    localStorage.removeItem('username');
    fetch('/api/logoutUser', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(function(response){
        location.href = "/login";
    })
    .catch((error) => {
    console.error('Error:', error);
    });
    
};

(() => {
    let logButtonText = 'Logout';
    if(window.hasOwnProperty('active_socket_conn')){
        const sock = window.active_socket_conn;
        sock.on('usernameResponse', (username) => {
            localStorage.username = username
            document.querySelector('#navbar-username').textContent = username;
        });

        if('username' in localStorage){
            if(localStorage.username === 'Guest'){
                logButtonText = 'Log In / Sign Up';
                sock.emit('usernameRequest');
            }
        }
        else{
            localStorage.username = 'Guest';
            logButtonText = 'Log In / Sign Up';
            sock.emit('usernameRequest');
        }
    }
    else{
        if(!('username' in localStorage)){
            logButtonText = 'Log In / Sign Up';
            localStorage.username = 'Guest';
        }
    }
    if(localStorage.username.substring(0, 5) === 'Guest'){
        logButtonText = 'Log In / Sign Up';
    }
    const navbarHTML = `
        <div class="topnav">
            <a href="/lobby">Lobby</a>
            <a href="#news">Game Stats</a>
            <a href="/about">About</a>
            <div class="topnav-right">
                <a id="navbar-username">${localStorage.username}</a>
                <a href="#" id="logout-button">${logButtonText}</a>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    // set active class on link representing current page
    const page = window.location.href.split("/")[window.location.href.split("/").length - 1];
    try{
        document.querySelector(`.topnav a[href='/${page}']`).classList.toggle('active');
    }
    catch(err){
        console.log(err);
    }
    document
    .querySelector('#logout-button')
    .addEventListener('click', logout);
})();
