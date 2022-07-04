const Timer = function(callback, delay){
    let timerID = null;
    let start, remaining = delay;


    this.pause = function(){
        clearTimeout(timerID)
        timerID = null;
        remaining -= Date.now() - start;
        console.log(`Paused with ${remaining / 1000} seconds left.`);
    };

    this.resume = function(){
        if(timerID){
            return false;
        }
        if(remaining < 0){
            return false;
        }
        start = Date.now()
        timerID = setTimeout(callback, remaining)
    }

    this.resume();
};

module.exports = Timer;