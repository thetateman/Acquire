const onSearch = (e) => {
    e.preventDefault();
    let usernameToSearch = document.querySelector('#search-username').value;
    fetch(`/api/searchUser?username=${usernameToSearch}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        })
        .then(function(response){
            response.json().then(function(json){
                let success = displayLoginError(json.error);
                console.log('Success:', json);
                if(success){
                    //populate page with results
                }
            })
            .catch((error) => {
                console.error('Got response, but had issue processing it: ', error);
            })
        })
        .catch((error) => {
        console.error('Error:', error);
    });
    //do stuff after search, before response
}

(() => {
    document.querySelector('#search-form').addEventListener('submit', onSearch);
})();
