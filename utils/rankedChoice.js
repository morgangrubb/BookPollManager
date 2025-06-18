/**
 * Implements Instant Runoff Voting (IRV) for ranked choice voting
 * @param {Array} candidates - Array of nomination objects
 * @param {Array} votes - Array of vote objects with rankings
 * @returns {Object} Results object with winner and elimination rounds
 */
function calculateRankedChoiceWinner(candidates, votes) {
    if (!candidates || candidates.length === 0) {
        return { winner: null, rounds: [], error: 'No candidates' };
    }
    
    if (!votes || votes.length === 0) {
        return { winner: null, rounds: [], error: 'No votes' };
    }
    
    // Initialize candidates with indices
    const candidatesList = candidates.map((candidate, index) => ({
        ...candidate,
        index: index,
        eliminated: false
    }));
    
    const rounds = [];
    let activeVotes = votes.map(vote => ({
        ...vote,
        currentPreference: 0 // Index of current preference in rankings
    }));
    
    while (true) {
        const activeCandidates = candidatesList.filter(c => !c.eliminated);
        
        if (activeCandidates.length === 1) {
            // We have a winner
            return {
                winner: activeCandidates[0],
                rounds,
                totalVotes: votes.length,
                method: 'Instant Runoff Voting (IRV)'
            };
        }
        
        if (activeCandidates.length === 0) {
            // No candidates left (shouldn't happen)
            return {
                winner: null,
                rounds,
                error: 'No active candidates remaining'
            };
        }
        
        // Count first preferences for active candidates
        const voteCounts = new Map();
        activeCandidates.forEach(candidate => {
            voteCounts.set(candidate.index, 0);
        });
        
        // Count votes for this round
        activeVotes.forEach(vote => {
            // Find the highest preference candidate that hasn't been eliminated
            for (let i = vote.currentPreference; i < vote.rankings.length; i++) {
                const candidatePosition = vote.rankings[i] - 1; // Convert to 0-based index
                const candidate = candidatesList[candidatePosition];
                
                if (candidate && !candidate.eliminated) {
                    voteCounts.set(candidate.index, voteCounts.get(candidate.index) + 1);
                    vote.currentPreference = i;
                    break;
                }
            }
        });
        
        // Calculate percentages
        const totalValidVotes = activeVotes.length;
        const roundResults = activeCandidates.map(candidate => ({
            candidate: {
                title: candidate.title,
                link: candidate.link,
                index: candidate.index
            },
            votes: voteCounts.get(candidate.index),
            percentage: totalValidVotes > 0 ? (voteCounts.get(candidate.index) / totalValidVotes * 100).toFixed(1) : 0
        }));
        
        // Sort by vote count (descending)
        roundResults.sort((a, b) => b.votes - a.votes);
        
        rounds.push({
            round: rounds.length + 1,
            results: roundResults,
            totalVotes: totalValidVotes
        });
        
        // Check if we have a majority winner (> 50%)
        const topCandidate = roundResults[0];
        if (topCandidate.votes > totalValidVotes / 2) {
            return {
                winner: candidatesList.find(c => c.index === topCandidate.candidate.index),
                rounds,
                totalVotes: votes.length,
                method: 'Instant Runoff Voting (IRV)',
                winType: 'majority'
            };
        }
        
        // Eliminate the candidate with the fewest votes
        const lowestCandidate = roundResults[roundResults.length - 1];
        const candidateToEliminate = candidatesList.find(c => c.index === lowestCandidate.candidate.index);
        candidateToEliminate.eliminated = true;
        
        rounds[rounds.length - 1].eliminated = {
            title: candidateToEliminate.title,
            votes: lowestCandidate.votes
        };
        
        // If we're down to 2 candidates and there's a tie, pick the one with more votes
        if (activeCandidates.length === 2) {
            const remaining = candidatesList.filter(c => !c.eliminated);
            if (remaining.length === 1) {
                return {
                    winner: remaining[0],
                    rounds,
                    totalVotes: votes.length,
                    method: 'Instant Runoff Voting (IRV)',
                    winType: 'elimination'
                };
            }
        }
    }
}

/**
 * Format results for display
 * @param {Object} results - Results from calculateRankedChoiceWinner
 * @returns {String} Formatted results string
 */
function formatResults(results) {
    if (!results.winner) {
        return `**No Winner Determined**\n${results.error || 'Unknown error'}`;
    }
    
    let output = `🏆 **Winner: ${results.winner.title}**\n`;
    output += `📊 **Method:** ${results.method}\n`;
    output += `📝 **Total Votes:** ${results.totalVotes}\n\n`;
    
    if (results.rounds && results.rounds.length > 0) {
        output += `**Voting Rounds:**\n`;
        
        results.rounds.forEach(round => {
            output += `\n**Round ${round.round}:**\n`;
            
            round.results.forEach((result, index) => {
                const position = index + 1;
                const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '📍';
                output += `${emoji} ${result.candidate.title}: ${result.votes} votes (${result.percentage}%)\n`;
            });
            
            if (round.eliminated) {
                output += `❌ *Eliminated: ${round.eliminated.title}*\n`;
            }
        });
    }
    
    return output;
}

module.exports = {
    calculateRankedChoiceWinner,
    formatResults
};
