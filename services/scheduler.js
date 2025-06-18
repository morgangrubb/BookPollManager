const cron = require('node-cron');
const { getActivePolls, updatePollPhase, completePoll, checkIfAllVoted } = require('./pollManager');

let schedulerStarted = false;

function startScheduler() {
    if (schedulerStarted) {
        console.log('Scheduler already started');
        return;
    }
    
    // Run every minute to check for poll phase transitions
    cron.schedule('* * * * *', async () => {
        try {
            await checkPollPhases();
        } catch (error) {
            console.error('Error in scheduled poll check:', error);
        }
    });
    
    schedulerStarted = true;
    console.log('Poll scheduler started - checking every minute');
}

async function checkPollPhases() {
    try {
        const activePolls = await getActivePolls();
        const now = new Date();
        
        for (const poll of activePolls) {
            // Check if nomination phase should end
            if (poll.phase === 'nomination' && now >= poll.nominationEnd) {
                console.log(`Transitioning poll ${poll.id} to voting phase`);
                await updatePollPhase(poll.id, 'voting');
                
                // Notify about phase change (you could send a Discord message here)
                console.log(`Poll "${poll.title}" has moved to voting phase`);
            }
            
            // Check if voting phase should end (by time or if everyone voted)
            if (poll.phase === 'voting') {
                const shouldEnd = now >= poll.votingEnd || await checkIfAllVoted(poll.id);
                
                if (shouldEnd) {
                    console.log(`Completing poll ${poll.id}${now >= poll.votingEnd ? ' (time ended)' : ' (all voted)'}`);
                    const results = await completePoll(poll.id);
                    
                    // Notify about poll completion
                    console.log(`Poll "${poll.title}" has been completed`);
                    if (results && results.winner) {
                        console.log(`Winner: ${results.winner.title}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error checking poll phases:', error);
    }
}

// Manual check function for testing
async function checkPollPhasesNow() {
    console.log('Running manual poll phase check...');
    await checkPollPhases();
}

module.exports = {
    startScheduler,
    checkPollPhasesNow
};
