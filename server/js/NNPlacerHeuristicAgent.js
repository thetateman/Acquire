const HeuristicAgent = require("./HeuristicAgent");
const tfjs_node = require('@tensorflow/tfjs-node');
const internalGameFunctions = require("./internalGameFunctions.js");
const aiHelpers = require("./aiHelpers");





class NNPlacerHeuristicAgent extends HeuristicAgent{
    async init(){
        this.model = await tfjs_node.loadLayersModel(`file://../model_1/model.json`);
    }

    async computerPlayTile(game, abstractGameFeatures){
        

        let potentialStates = [];
        let evaluations = new Array(6);
        game.state.player_states[game.state.turn].tiles.forEach((tile) => {
            if((tile.predicted_type === 'd' || tile.predicted_type === 'z')){
                potentialStates.push([]);
            }
            else{
                let gameCopy = JSON.parse(JSON.stringify(game));



                internalGameFunctions.updateGame(gameCopy, gameCopy.usernames[gameCopy.state.turn], gameCopy.state.expectedNextAction, {x: tile.x, y: tile.y}, {admin: false, verbose: false});
                potentialStates.push(aiHelpers.stateToVector(gameCopy.state));
            }
            
        });
        for(let i=0; i<potentialStates.length; i++){
            if(potentialStates[i].length === 0){
                evaluations[i] = -1;
            }
            else{
                evaluations[i] = (await this.model.predict(tfjs_node.tensor([potentialStates[i]])).array())[0][0];
            }
            
        }
        //let max = evaluations.indexOf(Math.max(evaluations));
        let max = 999;
        let maxIndex = 0;
        for(let i = 0; i<evaluations.length; i++){
            if(evaluations[i] === -1) {
                continue;
            }
            if(evaluations[i] < max){ //lol
                max = evaluations[i];
                maxIndex = i;
            }
        }
        return {x: game.state.player_states[game.state.turn].tiles[maxIndex].x, y: game.state.player_states[game.state.turn].tiles[maxIndex].y};

    }
}

module.exports = NNPlacerHeuristicAgent;