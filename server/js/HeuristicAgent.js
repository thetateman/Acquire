"use strict";

const sharedGameFunctions = require("./sharedGameFunctions.js");
const Agent = require("./Agent");

class HeuristicAgent extends Agent{

    computerPlayTile(game, abstractGameFeatures){
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
            selectedTile = abstractGameFeatures.tileFeatures.find((tile) => !['m', 'd', 'z'].includes(tile.predicted_type));
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
    }

    computerPurchaseShares(game, abstractGameFeatures){
        let move = {purchase: {}};
        let firstOrSecondRankedChains = [];
        let chainsToBuy = [];
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

        chainsToBuy = firstOrSecondRankedChains.filter((chain) => {
            // filter out if:
            // 1. I have > 12 shares
            // 2. Chain unlikely to merge soon && early in game ??
            // 3. I have a distinct lead in the stock. but I would need to keep cash in reserve to protect lead ???
            if(game.state.player_states[game.state.turn][chain] > 12){
                return false;
            }
            return true;
        });

        let preferenceRankedChainsToBuy = sharedGameFunctions.shuffleArray(chainsToBuy); // TODO: fix this
        
        preferenceRankedChainsToBuy.forEach((chain) => {
            if(numSharesAdded <= 2 && !game.state.available_chains.includes(chain)){
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
                    if(maxPurchasableShares !== 0){
                        move.purchase[chain] = maxPurchasableShares;
                        numSharesAdded += maxPurchasableShares;
                        spentCash += game.state.share_prices[chain] * maxPurchasableShares;
                    }
                }
                
            }
        });
        if(sharedGameFunctions.gameIsEndable(game)){
            move.endGame = true;
        }
      
        return move;

    }

    computerChooseNewChain(game){
        let myLargestPosition = game.state.available_chains[0];
        game.state.available_chains.forEach((chain) => {
            if(game.state.player_states[game.state.turn][chain] > game.state.player_states[game.state.turn][myLargestPosition]){
                myLargestPosition = chain;
            }
        })
        let move = {newChainChoice: myLargestPosition};
        return move;
    }

    computerChooseRemainingChain(game, abstractGameFeatures){
        let move = {remainingChainChoice: game.state.active_merger.largest_chains[0]};
        let acceptableRemainingChains = [];
        game.state.active_merger.largest_chains.forEach((chain) => {
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
            if(myRankInChain !== 1){
                acceptableRemainingChains.push(chain);
            }
        });
        if(acceptableRemainingChains[0]){
            move.remainingChainChoice = acceptableRemainingChains[0];
        }
        return move;
    }

    computerChooseNextElimChain(game){
        let move = {nextElimChain: game.state.active_merger.elim_chains_ranked[0][0]};
        return move;
    }

    computerDisposeShares(game){
        let move = {sell: 0, trade: 0, keep: 0};
        let disposingChain = game.state.active_merger.elim_chains[game.state.active_merger.disposing_chain_index];
        let numSharesToDispose = game.state.player_states[game.state.turn][disposingChain];
        let numSharesToTrade = 0;

        if(game.state.share_prices[game.state.active_merger.remaining_chain] > game.state.share_prices[disposingChain] * 2){
            // trade max
            numSharesToTrade = 2 * Math.floor(numSharesToDispose / 2);
            if(numSharesToTrade / 2 > game.state.bank_shares[game.state.active_merger.remaining_chain]){
                numSharesToTrade = 4 * Math.floor(game.state.bank_shares[game.state.active_merger.remaining_chain] / 2);
            }
            move.trade = numSharesToTrade;
            numSharesToDispose -= numSharesToTrade;
        }
        if(game.state.play_count > 50){
            move.sell = numSharesToDispose;
        }
        else{
            move.keep = numSharesToDispose;
        }
        return move;

    }
}

module.exports = HeuristicAgent;