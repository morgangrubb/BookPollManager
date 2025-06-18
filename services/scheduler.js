const cron = require('node-cron');
const { getActivePolls, updatePollPhase, completePoll, checkIfAllVoted } = require('./pollManager');
const { EmbedBuilder } = require('discord.js');

let schedulerStarted = false;
let discordClient = null;

function startScheduler(client) {
    if (schedulerStarted) {
        console.log('Scheduler already started');
        return;
    }
    
    discordClient = client;
    
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
                
                // Send voting phase announcement to Discord channel
                await announceVotingPhase(poll);
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

async function announceVotingPhase(poll) {
    if (!discordClient) return;
    
    try {
        const guild = await discordClient.guilds.fetch(poll.guildId);
        const channel = await guild.channels.fetch(poll.channelId);
        
        if (!channel) {
            console.log(`Channel ${poll.channelId} not found for poll ${poll.id}`);
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🗳️ Voting Phase Has Begun!')
            .setDescription(`**${poll.title}**\n\nNominations are now closed. Time to vote!`)
            .setColor(0x00FF00)
            .addFields(
                { name: '📚 Nominations', value: poll.nominations.length.toString(), inline: true },
                { name: '⏰ Voting Ends', value: `<t:${Math.floor(poll.votingEnd.getTime() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: `Use /poll vote to submit your ranked preferences • Poll ID: ${poll.id}` });
        
        // List all nominations for voting reference
        if (poll.nominations && poll.nominations.length > 0) {
            const nominationsList = poll.nominations.map((nom, index) => 
                `${index + 1}. **${nom.title}** by ${nom.author}\n   [Link](${nom.link})`
            ).join('\n');
            
            embed.addFields({
                name: '📖 Books to Vote On',
                value: nominationsList.length > 1000 ? 
                    nominationsList.substring(0, 1000) + '...' : 
                    nominationsList,
                inline: false
            });
        }
        
        await channel.send({ embeds: [embed] });
        console.log(`Sent voting phase announcement for poll ${poll.id} to channel ${poll.channelId}`);
        
    } catch (error) {
        console.error(`Error sending voting phase announcement for poll ${poll.id}:`, error);
    }
}

module.exports = {
    startScheduler,
    checkPollPhasesNow,
    announceVotingPhase
};
