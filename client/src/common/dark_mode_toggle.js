(() => {
    if(!('dark_mode' in localStorage)){
        localStorage.dark_mode = 'true';
    }
    if(localStorage.dark_mode === 'false'){
        document.body.classList.toggle('dark-mode');
        document.querySelector('#color-scheme-toggle').checked = true;
    }
    document
    .querySelector('#color-scheme-toggle')
    .addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.dark_mode = (localStorage.dark_mode === 'true') ? 'false' : 'true';
    });
})();