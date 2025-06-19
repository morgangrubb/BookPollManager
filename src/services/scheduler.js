// Serverless Scheduler for Cloudflare Workers
import { PollManager } from './pollManager.js';

export async function checkPollPhases(env) {
    try {
        // Add timeout protection for scheduler
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Scheduler timeout')), 20000); // 20 second timeout
        });

        const schedulerPromise = (async () => {
            const pollManager = new PollManager(env);
            
            // Get active polls with simplified query
            const activePolls = await pollManager.db.prepare(`
                SELECT id, phase, nomination_deadline, voting_deadline, channel_id, guild_id, title, tally_method
                FROM polls 
                WHERE phase IN ('nomination', 'voting') 
                LIMIT 10
            `).all();
            
            const polls = activePolls.results || [];
            console.log(`Checking ${polls.length} active polls`);
            
            const now = new Date();
            
            for (const poll of polls) {
                try {
                    const nominationDeadline = new Date(poll.nomination_deadline);
                    const votingDeadline = new Date(poll.voting_deadline);
                    
                    // Check if nomination phase should end
                    if (poll.phase === 'nomination' && now >= nominationDeadline) {
                        console.log(`Ending nomination phase for poll ${poll.id}`);
                        await pollManager.updatePollPhase(poll.id, 'voting');
                        
                        // Get full poll data for announcement
                        const fullPoll = await pollManager.getPoll(poll.id);
                        if (fullPoll) {
                            await announceVotingPhase(fullPoll, env);
                        }
                    }
                    
                    // Check if voting phase should end
                    else if (poll.phase === 'voting' && now >= votingDeadline) {
                        console.log(`Ending voting phase for poll ${poll.id}`);
                        await pollManager.updatePollPhase(poll.id, 'completed');
                        
                        // Get full poll data for announcement
                        const fullPoll = await pollManager.getPoll(poll.id);
                        if (fullPoll) {
                            await announcePollCompletion(fullPoll, env);
                        }
                    }
                } catch (pollError) {
                    console.error(`Error processing poll ${poll.id}:`, pollError);
                    // Continue with next poll instead of failing entirely
                }
            }
        })();

        await Promise.race([schedulerPromise, timeoutPromise]);
    } catch (error) {
        console.error('Error checking poll phases:', error);
        if (error.message === 'Scheduler timeout') {
            console.error('Scheduler timed out - skipping this cycle');
        }
    }
}

async function announceVotingPhase(poll, env) {
    try {
        // Send announcement to Discord channel
        const embed = {
            title: '🗳️ Voting Phase Started!',
            description: `**${poll.title}**\n\nNomination phase has ended. Voting is now open!`,
            color: 0xffaa00,
            fields: [
                {
                    name: '📚 Nominated Books',
                    value: poll.nominations.map((nom, idx) => 
                        `${idx + 1}. **${nom.title}** ${nom.author ? `by ${nom.author}` : ''}`
                    ).join('\n') || 'No nominations',
                    inline: false
                },
                {
                    name: '📊 Voting Method',
                    value: poll.tallyMethod === 'chris-style' ? 'Chris Style (Top 3 Points)' : 'Ranked Choice (IRV)',
                    inline: true
                },
                {
                    name: '⏰ Voting Deadline',
                    value: `<t:${Math.floor(new Date(poll.votingDeadline).getTime() / 1000)}:F>`,
                    inline: true
                }
            ],
            footer: { text: `Poll ID: ${poll.id}` }
        };

        const components = [{
            type: 1, // Action Row
            components: [{
                type: 2, // Button
                style: 1, // Primary
                label: '🗳️ Vote Now',
                custom_id: `vote_${poll.id}`
            }]
        }];

        await sendDiscordMessage(poll.channelId, { embeds: [embed], components }, env);
    } catch (error) {
        console.error('Error announcing voting phase:', error);
    }
}

async function announcePollCompletion(poll, env) {
    try {
        if (!poll.results || !poll.results.winner) {
            console.log('Poll completed but no results available');
            return;
        }

        const embed = poll.tallyMethod === 'chris-style' 
            ? createChrisStyleResultsEmbed(poll, poll.results)
            : createRankedChoiceResultsEmbed(poll, poll.results);

        await sendDiscordMessage(poll.channelId, { embeds: [embed] }, env);
    } catch (error) {
        console.error('Error announcing poll completion:', error);
    }
}

function createChrisStyleResultsEmbed(poll, results) {
    const sortedBooks = results.allBooks
        .sort((a, b) => b.points - a.points)
        .slice(0, 10); // Show top 10

    const resultsText = sortedBooks.map((book, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        return `${medal} **${book.title}** ${book.author ? `by ${book.author}` : ''} - ${book.points} points`;
    }).join('\n');

    return {
        title: '🏆 Poll Results - Chris Style',
        description: `**${poll.title}**\n\n${resultsText}`,
        color: 0x00ff00,
        fields: [
            {
                name: '👑 Winner',
                value: `**${results.winner.title}** ${results.winner.author ? `by ${results.winner.author}` : ''} with ${results.winner.points} points!`,
                inline: false
            }
        ],
        footer: { text: `Poll ID: ${poll.id} | ${poll.votes.length} votes cast` },
        timestamp: new Date().toISOString()
    };
}

function createRankedChoiceResultsEmbed(poll, results) {
    const finalStandings = results.finalStandings || [];
    const resultsText = finalStandings.slice(0, 10).map((book, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        return `${medal} **${book.title}** ${book.author ? `by ${book.author}` : ''}`;
    }).join('\n');

    return {
        title: '🏆 Poll Results - Ranked Choice',
        description: `**${poll.title}**\n\n${resultsText}`,
        color: 0x00ff00,
        fields: [
            {
                name: '👑 Winner',
                value: `**${results.winner.title}** ${results.winner.author ? `by ${results.winner.author}` : ''}`,
                inline: false
            },
            {
                name: '📊 Elimination Rounds',
                value: `${results.rounds?.length || 0} rounds`,
                inline: true
            }
        ],
        footer: { text: `Poll ID: ${poll.id} | ${poll.votes.length} votes cast` },
        timestamp: new Date().toISOString()
    };
}

async function sendDiscordMessage(channelId, content, env) {
    try {
        if (!env.DISCORD_TOKEN) {
            console.error('Discord token not available');
            return;
        }

        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });

        if (!response.ok) {
            console.error('Failed to send Discord message:', await response.text());
        }
    } catch (error) {
        console.error('Error sending Discord message:', error);
    }
}