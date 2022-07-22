"use strict";

const sharedGameFunctions = require("./sharedGameFunctions.js");

const computerPlayer = {
    makeNextMove: function(game){
        /**
        * Calculates *reasonable* next move in the game, for the player <game.state.turn>.
        * @param {object} game - the game to be updated.
        * @returns {object} object representing a game action, may be passed to updateGame().
        */
       const abstractGameFeatures = this.getAbstractGameFeatures(game);
       switch(game.state.expectedNextAction){
        case 'playTile':
            return this.computerPlayTile(game, abstractGameFeatures);
        case 'purchaseShares':
            return this.computerPurchaseShares(game, abstractGameFeatures);
        case 'chooseNewChain':
            return this.computerChooseNewChain(game, abstractGameFeatures);
        case 'chooseRemainingChain':
            return this.computerChooseRemainingChain(game, abstractGameFeatures);
        case 'chooseNextElimChain':
            return this.computerChooseNextElimChain(game, abstractGameFeatures)
        case 'disposeShares':
            return this.computerDisposeShares(game, abstractGameFeatures);
        default:
            return 'unexpectedActionType';
       }
    },

    getAbstractGameFeatures: function(game){
        let abstractGameFeatures = {
            tileFeatures: [],
            i: {
                iCanMergeIn: -1,
                tilesToMerge: -1,
                myPosition: '', // ['absoluteLead', 'defendableLead', 'absoluteSecond', 'defendableSecond', ]

            },
            c: {

            },
            a: {

            }, 
            w: {

            },
            f: {

            }, 
            l: {

            },
            t: {

            }
        };
        game.state.player_states[game.state.turn].tiles.forEach((tile) => {
            let tileFeatures = JSON.parse(JSON.stringify(tile));
            tileFeatures.neighbors = sharedGameFunctions.getNeighbors(game.state.board, tile.x, tile.y);
            tileFeatures.connectingTrueChains = tileFeatures.neighbors.filter((f) => ['i', 'c', 'w', 'f', 'a', 't', 'l'].includes(f));
            tileFeatures.predicted_type = sharedGameFunctions.predictTileType(game.state.board, game.state.chains, game.state.available_chains, tile.x, tile.y);  
            abstractGameFeatures.tileFeatures.push(tileFeatures);          
        });
        ['i', 'c', 'w', 'f', 'a', 't', 'l'].forEach((chain) => {
            let positions = [];
            game.state.player_states.forEach((player) => {
                positions.push(player[chain]);
            });
            abstractGameFeatures[chain].positions = positions;
        });
        return abstractGameFeatures;
    },
    
    computerPlayTile: function(game, abstractGameFeatures){
        //maybe make copy of game and examine effect of playing each tile...

        let selectedTile;
        // First try to find a favorable merger
        selectedTile = abstractGameFeatures.tileFeatures.find((tile) => {
            if(tile.predicted_type === 'm'){
                let playMerger = false;
                let mergerInfo = sharedGameFunctions.getMergerInfo(game, tile.connectingTrueChains);
                mergerInfo.elimChains.forEach((elimChain) => {
                    let myPositionInElimChain = abstractGameFeatures[elimChain].positions[game.state.turn];
                    let myRankInElimChain = 1;
                    let numPlayersTiedForMyRank = 1;
                    for(let i=0; i<abstractGameFeatures[elimChain].positions; i++){
                        if(i === game.state.turn){
                            continue;
                        }
                        if(abstractGameFeatures[elimChain].positions[i] === myPositionInElimChain){
                            numPlayersTiedForMyRank++;
                        }
                        else if(abstractGameFeatures[elimChain].positions[i] > myPositionInElimChain){
                            myRankInElimChain++;
                        }
                    }
                    if(myRankInElimChain === 1 && numPlayersTiedForMyRank === 1){
                        playMerger = true;
                    }
                });
                if(playMerger){
                    return true;
                }
            }
        });

        if(!selectedTile){
            selectedTile = abstractGameFeatures.tileFeatures.find((tile) => tile.predicted_type === 'n');
        }

        if(!selectedTile){
            game.state.player_states[game.state.turn].tiles.forEach((tile) => {
                if(!(tile.predicted_type === 'd' || tile.predicted_type === 'z')){
                    selectedTile = tile;
                }
            });
        }

        let move = {x: selectedTile.x, y: selectedTile.y}
        return move;
    },

    computerPurchaseShares: function(game, abstractGameFeatures){
        let move = {purchase: {}};
        let firstOrSecondRankedChains = [];
        let numSharesAdded = 0;
        let spentCash = 0;
        const chains = ['i', 'c', 'w', 'f', 'a', 't', 'l'];
        chains.forEach((chain) => {
            let myPositionInChain = abstractGameFeatures[chain].positions[game.state.turn];
            let myRankInChain = 1;
            for(let i=0; i<abstractGameFeatures[chain].positions.length; i++){
                if(i === game.state.turn){
                    continue;
                }
                else if(abstractGameFeatures[chain].positions[i] > myPositionInChain){
                    myRankInChain++;
                }
            }
            if(myRankInChain < 3){
                firstOrSecondRankedChains.push(chain);
            }
        });
        console.log(firstOrSecondRankedChains);
        firstOrSecondRankedChains.forEach((chain) => {
            if(numSharesAdded <= 2 && !game.state.available_chains.includes(chain)){
                console.log(chain);
                let maxPurchasableShares = Math.floor((game.state.player_states[game.state.turn].cash - spentCash) / game.state.share_prices[chain]);
                if(maxPurchasableShares > 3 - numSharesAdded){
                    maxPurchasableShares = 3 - numSharesAdded;
                }
                if(game.state.bank_shares[chain] === 0){

                }
                else{
                    if(game.state.bank_shares[chain] < maxPurchasableShares){
                        maxPurchasableShares = game.state.bank_shares[chain];
                    }
                    move.purchase[chain] = maxPurchasableShares;
                    numSharesAdded += maxPurchasableShares;
                    spentCash += game.state.share_prices[chain] * maxPurchasableShares;
                }
                
            }
        });
        /*
        if(numSharesAdded < 3){

        }
        */
        return move;

    },

    computerChooseNewChain: function(game){
        let move = {newChainChoice: game.state.available_chains[0]};
        return move;
    },

    computerChooseRemainingChain: function(game){
        let move = {remainingChainChoice: game.state.active_merger.largest_chains[0]};
        return move;
    },

    computerChooseNextElimChain: function(game){
        let move = {nextElimChain: game.state.active_merger.elim_chains_ranked[0][0]};
        return move;
    },

    computerDisposeShares: function(game){
        let disposingChain = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
        let move = {sell: game.state.player_states[game.state.turn][disposingChain], trade: 0, keep: 0};
        return move;

    },

}

module.exports = computerPlayer;