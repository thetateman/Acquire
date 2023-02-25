const tfjs_node = require('@tensorflow/tfjs-node');
const mathjs = require("mathjs");

const HeuristicAgent = require("./HeuristicAgent");
const internalGameFunctions = require("./internalGameFunctions.js");
const aiHelpers = require("./aiHelpers");





class NNPlacerHeuristicAgent extends HeuristicAgent{
    async init(){
        this.model = await tfjs_node.loadLayersModel(`file://../neural_networks/model_1/model.json`);
    }

    async computerPlayTile(game, abstractGameFeatures){
        

        let potentialStates = [];
        let nextStateMine = true;
        let evaluations = new Array(6);
        game.state.player_states[game.state.turn].tiles.forEach((tile) => {
            if((tile.predicted_type === 'd' || tile.predicted_type === 'z')){
                potentialStates.push([]);
            }
            else{
                let gameCopy = JSON.parse(JSON.stringify(game));



                internalGameFunctions.updateGame(gameCopy, gameCopy.usernames[gameCopy.state.turn], gameCopy.state.expectedNextAction, {x: tile.x, y: tile.y}, {admin: false, verbose: false});
                if(game.state.turn !== gameCopy.state.turn) nextStateMine = false;
                potentialStates.push(aiHelpers.stateToShapedMatrix(gameCopy.state));
            }
            
        });
        let move;
        
        for(let i=0; i<potentialStates.length; i++){
            if(potentialStates[i].length === 0){
                evaluations[i] = -1;
            }
            else{
                // need to reshape and concatenate channels 
                let thing = (await this.model.predict([tfjs_node.tensor([potentialStates[i][0]]), tfjs_node.tensor([potentialStates[i][1]])]).array());
                evaluations[i] = (await this.model.predict([tfjs_node.tensor([potentialStates[i][0]]), tfjs_node.tensor([potentialStates[i][1]])]).array())[0][game.state.turn];
            }
            
        }
        //let max = evaluations.indexOf(Math.max(evaluations));
        let max = -1;
        let maxIndex = 0;
        for(let i = 0; i<evaluations.length; i++){
            if(evaluations[i] === -1) {
                continue;
            }
            if(evaluations[i] > max){
                max = evaluations[i];
                maxIndex = i;
            }
        }
        move = {x: game.state.player_states[game.state.turn].tiles[maxIndex].x, y: game.state.player_states[game.state.turn].tiles[maxIndex].y};

        return move;

    }
}

module.exports = NNPlacerHeuristicAgent;