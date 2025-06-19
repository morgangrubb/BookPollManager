/**
 * Implements Instant Runoff Voting (IRV) for ranked choice voting
 * @param {Array} candidates - Array of nomination objects
 * @param {Array} votes - Array of vote objects with rankings
 * @returns {Object} Results object with winner and elimination rounds
 */
export function calculateRankedChoiceWinner(candidates, votes) {
    if (candidates.length === 0) {
        return { winner: null, rounds: [], totalVotes: votes.length };
    }
    
    if (candidates.length === 1) {
        return { 
            winner: candidates[0], 
            rounds: [{ eliminated: null, votes: { [0]: votes.length } }],
            totalVotes: votes.length 
        };
    }
    
    let remainingCandidates = [...candidates];
    let currentVotes = votes.map(vote => ({ ...vote }));
    const rounds = [];
    
    while (remainingCandidates.length > 1) {
        // Count first choice votes for remaining candidates
        const voteCounts = {};
        remainingCandidates.forEach((_, index) => {
            voteCounts[index] = 0;
        });
        
        currentVotes.forEach(vote => {
            // Find the highest ranked remaining candidate
            for (const ranking of vote.rankings) {
                const candidateIndex = ranking - 1;
                if (remainingCandidates[candidateIndex]) {
                    voteCounts[candidateIndex]++;
                    break;
                }
            }
        });
        
        // Check if any candidate has majority
        const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
        const majority = Math.floor(totalVotes / 2) + 1;
        
        for (const [index, count] of Object.entries(voteCounts)) {
            if (count >= majority) {
                rounds.push({ eliminated: null, votes: voteCounts });
                return { 
                    winner: remainingCandidates[index], 
                    rounds,
                    totalVotes: votes.length 
                };
            }
        }
        
        // Find candidate with least votes to eliminate
        let minVotes = Infinity;
        let eliminateIndex = -1;
        
        for (const [index, count] of Object.entries(voteCounts)) {
            if (count < minVotes) {
                minVotes = count;
                eliminateIndex = parseInt(index);
            }
        }
        
        // Record this round
        rounds.push({ 
            eliminated: remainingCandidates[eliminateIndex], 
            votes: { ...voteCounts } 
        });
        
        // Remove eliminated candidate
        remainingCandidates.splice(eliminateIndex, 1);
        
        // Update vote rankings to remove eliminated candidate
        currentVotes.forEach(vote => {
            vote.rankings = vote.rankings.filter(ranking => 
                remainingCandidates[ranking - 1] !== undefined
            );
        });
    }
    
    return { 
        winner: remainingCandidates[0] || null, 
        rounds,
        totalVotes: votes.length 
    };
}

/**
 * Format results for display
 * @param {Object} results - Results from calculateRankedChoiceWinner
 * @returns {String} Formatted results string
 */
export function formatResults(results) {
    if (!results.winner) {
        return "No winner determined.";
    }
    
    let output = `Winner: ${results.winner.title}\n\n`;
    
    if (results.rounds.length > 1) {
        output += "Elimination rounds:\n";
        results.rounds.forEach((round, index) => {
            if (round.eliminated) {
                output += `Round ${index + 1}: ${round.eliminated.title} eliminated\n`;
            }
        });
    }
    
    return output;
}