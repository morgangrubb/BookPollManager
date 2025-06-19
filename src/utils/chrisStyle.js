/**
 * Implements Chris-style voting where users pick exactly 3 books
 * First place gets 3 points, second gets 2 points, third gets 1 point
 * @param {Array} candidates - Array of nomination objects
 * @param {Array} votes - Array of vote objects with rankings
 * @returns {Object} Results object with winner and final scores
 */
export function calculateChrisStyleWinner(candidates, votes) {
    const scores = {};
    
    // Initialize scores for all candidates
    candidates.forEach((candidate, index) => {
        scores[index] = {
            nomination: candidate,
            points: 0
        };
    });
    
    // Calculate points from votes
    votes.forEach(vote => {
        vote.rankings.forEach((bookIndex, position) => {
            const candidateIndex = bookIndex - 1;
            if (scores[candidateIndex]) {
                // Award points: 3 for first, 2 for second, 1 for third
                const points = Math.max(0, 3 - position);
                scores[candidateIndex].points += points;
            }
        });
    });
    
    // Sort candidates by points (highest first)
    const sortedResults = Object.values(scores)
        .sort((a, b) => b.points - a.points);
    
    return {
        winner: sortedResults[0]?.nomination || null,
        standings: sortedResults,
        totalVotes: votes.length
    };
}

/**
 * Format chris-style results for display
 * @param {Object} results - Results from calculateChrisStyleWinner
 * @returns {String} Formatted results string
 */
export function formatChrisStyleResults(results) {
    if (!results.winner) {
        return "No winner determined.";
    }
    
    let output = `Chris-Style Winner: ${results.winner.title}\n\n`;
    output += "Final Standings:\n";
    
    results.standings.forEach((result, index) => {
        const position = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
        output += `${position} ${result.nomination.title} - ${result.points} points\n`;
    });
    
    return output;
}