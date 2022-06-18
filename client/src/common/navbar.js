const logout = () => {
    //localStorage.clear();
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

(() => {
    const navbarHTML = `
        <div class="topnav">
            <a href="/lobby">Lobby</a>
            <a href="#news">Game Stats</a>
            <a href="/about">About</a>
            <div class="topnav-right">
                <a id="navbar-username">${localStorage.username}</a>
                <a href="#" id="logout-button">Logout</a>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    // set active class on link representing current page
    const page = window.location.href.split("/")[window.location.href.split("/").length - 1];
    document.querySelector(`.topnav a[href='/${page}']`).classList.toggle('active');


    document
    .querySelector('#logout-button')
    .addEventListener('click', logout);
})();
