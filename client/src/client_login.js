function displaySignupError(errorType){
    let success = false;
    let errorText;
    if(errorType === 'dupEmail'){
        errorText = "That email address is already in use."
    }
    else if(errorType === 'dupUsername'){
        errorText = "That username is already in use."
    } 
    else {
        success = true;
    }
    if(!success){
        let errorMessage = `<text style="color:red;">${errorText}.</text>`;
        document.querySelector('#error-message2').innerHTML = errorMessage;
    }
    return success;
};
function displayLoginError(errorType){
    let success = false;
    let errorText;
    if(errorType === 'wrongLoginID'){
        errorText = "Not a valid username or email address."
    }
    else if(errorType === 'wrongPassword'){
        errorText = "Incorrect Password."
    } 
    else {
        success = true;
    }
    if(!success){
        let errorMessage = `<text style="color:red;">${errorText}.</text>`;
        document.querySelector('#error-message1').innerHTML = errorMessage;
    }
    return success;
};

const onLogin = (e) => {
    e.preventDefault();
    const login_id = document.querySelector('#login_id').value;
    const login_pw = document.querySelector('#login_pw').value;


    const credentials = { loginID: login_id,
                    password: login_pw,
                     };
    
    fetch('/api/loginUser', {
        method: 'POST', // or 'PUT'
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        })
        .then(function(response){
            response.json().then(function(json){
                let success = displayLoginError(json.result);
                console.log('Success:', json);
                if(success){
                    location.href = "/";
                }
            })
        })
        .catch((error) => {
        console.error('Error:', error);
        });


    //location.href = "http://localhost:8080";
};

const onSignUp = (e) => {
    
    e.preventDefault();

    const username = document.querySelector('#su_username').value;
    const email = document.querySelector('#su_email').value;
    const password = document.querySelector('#su_pw').value;
    const repeated_password = document.querySelector('#su_re_pw').value;

    let errorMessage = "";
    if(password !== repeated_password){
        errorMessage = '<text style="color:red;">Passwords must match.</text>';
        document.querySelector('#error-message2').innerHTML = errorMessage;
        return;
    }

    //TODO: input validation
    const credentials = { username: username,
                    email: email,
                    password: password,
                    repeated_password: repeated_password
                     };
    
    fetch('/api/createUser', {
        method: 'POST', // or 'PUT'
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        })
        .then(function(response){
            response.json().then(function(json){
                let success = displaySignupError(json.result);
                console.log('Success:', json);
                if(success){
                    location.href = "/";
                }
            })
        })
            /*
        .then(data => {
            if(data.problem !== "dupEmail"){
                console.log("gotem!");
                fetch(url).then(function(response) {
                    response.text().then(function(text) {
                        poemDisplay.textContent = text;
                    });
                    });
            }
            */
        
        .catch((error) => {
        console.error('Error:', error);
        });

    if(errorMessage !== ""){
        document.querySelector('#error-message2').innerHTML = errorMessage;
        return;
    }
    //location.href = "http://localhost:8080";
};

(() => {
    document
    .querySelector('#login-form')
    .addEventListener('submit', onLogin);

    //event listeners for sign up action
    document
    .querySelector('#password-form')
    .addEventListener('submit', onSignUp);
    

    /* oops...
    document
    .querySelector('#email-form')
    .addEventListener('submit', () => document.querySelector('#password-form').submit());
    */
})();