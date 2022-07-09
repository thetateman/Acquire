const Timer = function(callback, delay){
    let _timerID = null;
    let _start = delay;
    let _delay = delay;
    this.remaining = delay;



    this.pause = function(){
        clearTimeout(_timerID);
        _timerID = null;
        this.remaining -= Date.now() - _start;
    };

    this.resume = function(){
        if(_timerID){
            return false;
        }
        _start = Date.now();
        if(this.remaining < 0){
            return false;
        }
        _timerID = setTimeout(callback, this.remaining);
    };

    this.reset = function(){
        clearTimeout(_timerID);
        _timerID = null;
        _start = Date.now();
        _timerID = setTimeout(callback, _delay);
    };

    this.getRemaining = function(){
        if(_timerID){
            return this.remaining - (Date.now() - _start);
        }
        else{
            return this.remaining;
        }
    };

    this.resume();
};

module.exports = Timer;