const logout = () => {
    localStorage.clear();
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
    document
    .querySelector('#logout-button')
    .addEventListener('click', logout);
})();
