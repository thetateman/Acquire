function displaySignupError(errorType){
    let success = false;
    let errorText;
    if(errorType === 'dupEmail'){
        errorText = "That email address is already in use."
    }
    else if(errorType === 'dupUsername'){
        errorText = "That username is already in use."
    } 
    else if(errorType === 'invalidUsername'){
        errorText = "Try a username that is 3-35 alpha-numeric characters."
    }
    else if(errorType === 'invalidEmail'){
        errorText = "Please input an email address";
    }
    else if(errorType === 'tooManyRequests'){
        errorText = "Too many attempts, wait a minute to try again.";
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
    else if(errorType === 'tooManyRequests'){
        errorText = "Too many attempts, wait a minute to try again.";
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

    let buttonText = document.querySelector('#login-button-text');
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
                let success = displayLoginError(json.error);
                console.log('Success:', json);
                if(success){
                    localStorage.setItem('username', json.user.username);
                    buttonText = document.createElement('p'); // So we don't change button style during redirect
                    location.href = "/lobby";
                }
            })
            .catch((error) => {
                if(response.status === 503){
                    displayLoginError('tooManyRequests');
                }
                else{
                    console.error('Got response, but had issue processing it: ', error);
                }
            })
            .finally((info) => {
                buttonText.classList.toggle('active');
                buttonText.textContent = 'LOGIN';
            })
        })
        .catch((error) => {
        console.error('Error:', error);
    });
    buttonText.textContent = '.';
    buttonText.classList.toggle('active');
};

const onSignUp = (e) => {
    e.preventDefault();


    let buttonText = document.querySelector('#signup-button-text');
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
    else if(password.length < 1){
        errorMessage = '<text style="color:red;">Please input a password.</text>';
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
                let success = displaySignupError(json.error);
                console.log('Success:', json);
                if(success){
                    localStorage.setItem('username', json.user.username);
                    buttonText = document.createElement('p');
                    location.href = "/lobby";
                }
            })
            .catch((error) => {
                if(response.status === 503){
                    displaySignupError('tooManyRequests');
                }
                else{
                    console.error('Got response, but had issue processing it: ', error);
                }
            })
            .finally((info) => {
                buttonText.classList.toggle('active');
                buttonText.textContent = 'SIGN UP';
            })
        })
        .catch((error) => {
        console.error('Error:', error);
        });
    buttonText.textContent = '.';
    buttonText.classList.toggle('active');

    if(errorMessage !== ""){
        document.querySelector('#error-message2').innerHTML = errorMessage;
        return;
    }
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