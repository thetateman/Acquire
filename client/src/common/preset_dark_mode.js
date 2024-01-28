(()=>{
    if(!('dark_mode' in localStorage)){
        localStorage.dark_mode = 'true';
    }
    if(localStorage.dark_mode === 'false'){
        // Turn off dark mode
        document.body.classList.toggle('dark-mode');
    }
})();