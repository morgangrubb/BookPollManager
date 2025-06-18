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
    
    // Process each vote - adapt point system based on number of candidates
    const maxRankings = Math.min(3, candidates.length);
    
    votes.forEach(vote => {
        if (vote.rankings && vote.rankings.length >= maxRankings) {
            // Award points based on available positions
            for (let i = 0; i < maxRankings; i++) {
                const candidateIndex = vote.rankings[i] - 1; // Convert to 0-based index
                if (candidateIndex >= 0 && candidateIndex < candidates.length) {
                    let points;
                    if (maxRankings === 3) {
                        // Normal chris-style: 3, 2, 1 points
                        points = 3 - i;
                    } else if (maxRankings === 2) {
                        // Two books: 2, 1 points
                        points = 2 - i;
                    } else {
                        // One book: 1 point
                        points = 1;
                    }
                    scores.set(candidateIndex, scores.get(candidateIndex) + points);
                }
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