/**
 * Add this script to any page we need the dark mode toggle.
 * Assumes document body has class 'dark-mode'.
 * Assumes page has standard navigation bar.
 */
(() => {
    // Add toggle to page
    const toggleHTML = 
    `<label class="switch">
        <input id="color-scheme-toggle" type="checkbox">
        <span class="slider round"></span>
        <span class="color-label" id="light-label">Light</span>
        <span class="color-label" id="dark-label">Dark</span>
    </label>`;
    document.querySelector(".topnav-left").insertAdjacentHTML('beforeend', toggleHTML);

    if(!('dark_mode' in localStorage)){
        localStorage.dark_mode = 'true';
    }
    if(localStorage.dark_mode === 'false'){
        //set toggle
        document.querySelector('#color-scheme-toggle').checked = true;
    }
    document
    .querySelector('#color-scheme-toggle')
    .addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.dark_mode = (localStorage.dark_mode === 'true') ? 'false' : 'true';
    });
})();