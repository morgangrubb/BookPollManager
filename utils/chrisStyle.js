/**
 * Implements Chris-style voting where users pick exactly 3 books
 * First place gets 3 points, second gets 2 points, third gets 1 point
 * @param {Array} candidates - Array of nomination objects
 * @param {Array} votes - Array of vote objects with rankings
 * @returns {Object} Results object with winner and final scores
 */
function calculateChrisStyleWinner(candidates, votes) {
    if (!candidates || candidates.length === 0) {
        return { winner: null, finalScores: [], error: 'No candidates' };
    }
    
    if (!votes || votes.length === 0) {
        return { winner: null, finalScores: [], error: 'No votes' };
    }
    
    // Initialize scores for all candidates
    const scores = new Map();
    candidates.forEach((candidate, index) => {
        scores.set(index, 0);
    });
    
    // Process each vote
    votes.forEach(vote => {
        if (vote.rankings && vote.rankings.length >= 3) {
            // First place (3 points)
            const firstPlace = vote.rankings[0] - 1; // Convert to 0-based index
            if (firstPlace >= 0 && firstPlace < candidates.length) {
                scores.set(firstPlace, scores.get(firstPlace) + 3);
            }
            
            // Second place (2 points)
            const secondPlace = vote.rankings[1] - 1;
            if (secondPlace >= 0 && secondPlace < candidates.length) {
                scores.set(secondPlace, scores.get(secondPlace) + 2);
            }
            
            // Third place (1 point)
            const thirdPlace = vote.rankings[2] - 1;
            if (thirdPlace >= 0 && thirdPlace < candidates.length) {
                scores.set(thirdPlace, scores.get(thirdPlace) + 1);
            }
        }
    });
    
    // Create final scores array with candidate info
    const finalScores = candidates.map((candidate, index) => ({
        ...candidate,
        score: scores.get(index),
        index: index
    }));
    
    // Sort by score descending
    finalScores.sort((a, b) => b.score - a.score);
    
    // Determine winner (highest score)
    const winner = finalScores.length > 0 ? finalScores[0] : null;
    
    return {
        winner,
        finalScores,
        totalVotes: votes.length,
        method: 'Chris Style (Top 3 Points)'
    };
}

/**
 * Format chris-style results for display
 * @param {Object} results - Results from calculateChrisStyleWinner
 * @returns {String} Formatted results string
 */
function formatChrisStyleResults(results) {
    if (!results.winner) {
        return `**No Winner Determined**\n${results.error || 'Unknown error'}`;
    }
    
    let output = `🏆 **Winner: ${results.winner.title}** (${results.winner.score} points)\n`;
    output += `📊 **Method:** ${results.method}\n`;
    output += `📝 **Total Votes:** ${results.totalVotes}\n\n`;
    
    if (results.finalScores && results.finalScores.length > 0) {
        output += `**Final Scores:**\n`;
        
        results.finalScores.forEach((candidate, index) => {
            const position = index + 1;
            const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '📍';
            output += `${emoji} **${candidate.title}**: ${candidate.score} points\n`;
        });
    }
    
    return output;
}

module.exports = {
    calculateChrisStyleWinner,
    formatChrisStyleResults
};