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
    if(sessionStorage.banned === "true"){
        sessionStorage.banned = "false";
        location.reload();
    }
    let logButtonText = 'Log Out';
    if(window.hasOwnProperty('active_socket_conn')){
        const sock = window.active_socket_conn;
        sock.on('usernameResponse', (username) => {
            localStorage.username = username
            document.querySelector('#navbar-username').textContent = username;
            if(username.substring(0, 5) === 'Guest'){
                document.querySelector('#logout-button').textContent = 'Log In / Sign Up';
            }
            else {
                document.querySelector('#logout-button').textContent = 'Log Out';
            }
        });

        if('username' in localStorage){
            if(localStorage.username.substring(0, 5) === 'Guest'){
                logButtonText = 'Log In / Sign Up';
            }
        }
        else{
            localStorage.username = 'Guest';
            logButtonText = 'Log In / Sign Up';
        }
        sock.emit('usernameRequest');
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
            <div class="topnav-left">
                <a href="/lobby">Lobby</a>
                <a href="/stats">Game Stats</a>
                <a href="/about">About</a>
            </div>
            <div class="topnav-right">
                <a id="navbar-username">${localStorage.username}</a>
                <a href="#" id="logout-button">${logButtonText}</a>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    // set active class on link representing current page
    let page = window.location.href.split("/")[window.location.href.split("/").length - 1];
    if(page === ''){
        page = 'lobby'; // root redirects to lobby
    }
    if(page === 'lobby'){
        document.querySelector('.topnav').style.overflow = 'unset';
    }
    if(['about'].includes(page)){
        document.querySelector('.topnav').classList.toggle('fixed');
    }
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
