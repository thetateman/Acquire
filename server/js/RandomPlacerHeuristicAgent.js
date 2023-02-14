const HeuristicAgent = require("./HeuristicAgent");

class RandomPlacerHeuristicAgent extends HeuristicAgent{

    computerPlayTile(game, abstractGameFeatures){
        

        
        let availableTiles = [];

        //get all tiles that are not asleep or dead. should be > 0
        game.state.player_states[game.state.turn].tiles.forEach((tile) => {
            if(!(tile.predicted_type === 'd' || tile.predicted_type === 'z')){
                availableTiles.push(tile);
            }
        });

        if(availableTiles.length == 0){
            console.log(JSON.stringify(game));
            console.error("CRITICAL ERROR: Asked to play tile when there are none available in hand!")
        }

        const chosenTileIndex = Math.floor(Math.random() * (availableTiles.length));
        let move = {x: availableTiles[chosenTileIndex].x, y: availableTiles[chosenTileIndex].y};



        return move;
    }
}

module.exports = RandomPlacerHeuristicAgent;