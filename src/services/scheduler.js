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
        }
        
    } catch (error) {
        console.error('Error in checkPollPhases:', error);
        throw error;
    }
}

async function announceVotingPhase(poll, env) {
    try {
        // Send announcement to Discord channel
        const embed = {
            title: '🗳️ Voting Phase Started!',
            description: `Poll: **${poll.title}**\n\nNomination phase has ended. Time to vote!`,
            color: 0x00FF00,
            fields: [
                {
                    name: 'Nominated Books',
                    value: poll.nominations.length > 0 
                        ? poll.nominations.map((book, index) => 
                            `${index + 1}. **${book.title}**${book.author ? ` by ${book.author}` : ''}`
                          ).join('\n')
                        : 'No nominations',
                    inline: false
                },
                {
                    name: 'Voting Method',
                    value: poll.tallyMethod === 'chris-style' ? 'Chris Style (Top 3 picks)' : 'Ranked Choice',
                    inline: true
                },
                {
                    name: 'Voting Deadline',
                    value: `<t:${Math.floor(new Date(poll.votingDeadline).getTime() / 1000)}:F>`,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        await sendDiscordMessage(poll.channelId, { embeds: [embed] }, env);
        
    } catch (error) {
        console.error('Error announcing voting phase:', error);
    }
}

async function announcePollCompletion(poll, env) {
    try {
        const results = poll.results;
        let embed;

        if (poll.tallyMethod === 'chris-style') {
            embed = createChrisStyleResultsEmbed(poll, results);
        } else {
            embed = createRankedChoiceResultsEmbed(poll, results);
        }

        await sendDiscordMessage(poll.channelId, { embeds: [embed] }, env);
        
    } catch (error) {
        console.error('Error announcing poll completion:', error);
    }
}

function createChrisStyleResultsEmbed(poll, results) {
    return {
        title: '🏆 Poll Complete - Chris Style Results',
        description: `Poll: **${poll.title}**`,
        color: 0xFFD700,
        fields: [
            {
                name: '🥇 Winner',
                value: results.winner 
                    ? `**${results.winner.title}**\n${results.winner.author ? `by ${results.winner.author}\n` : ''}[Link](${results.winner.link})`
                    : 'No clear winner',
                inline: false
            },
            {
                name: '📊 Final Standings',
                value: results.standings.map((result, index) => {
                    const position = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    return `${position} **${result.nomination.title}** - ${result.points} points`;
                }).join('\n'),
                inline: false
            },
            {
                name: '📈 Participation',
                value: `${results.totalVotes} total votes`,
                inline: true
            }
        ],
        timestamp: new Date().toISOString()
    };
}

function createRankedChoiceResultsEmbed(poll, results) {
    return {
        title: '🏆 Poll Complete - Ranked Choice Results',
        description: `Poll: **${poll.title}**`,
        color: 0xFFD700,
        fields: [
            {
                name: '🥇 Winner',
                value: results.winner 
                    ? `**${results.winner.title}**\n${results.winner.author ? `by ${results.winner.author}\n` : ''}[Link](${results.winner.link})`
                    : 'No clear winner',
                inline: false
            },
            {
                name: '📊 Vote Distribution',
                value: results.standings.map((result, index) => {
                    const position = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    const percentage = results.totalVotes > 0 ? Math.round((result.votes / results.totalVotes) * 100) : 0;
                    return `${position} **${result.nomination.title}** - ${result.votes} votes (${percentage}%)`;
                }).join('\n'),
                inline: false
            },
            {
                name: '📈 Participation',
                value: `${results.totalVotes} total votes`,
                inline: true
            }
        ],
        timestamp: new Date().toISOString()
    };
}

async function sendDiscordMessage(channelId, content, env) {
    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Discord API error: ${response.status} - ${error}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending Discord message:', error);
        throw error;
    }
}