// Serverless interaction handlers for Cloudflare Workers
import { InteractionResponseType } from 'discord-interactions';
import { PollManager } from '../services/pollManager.js';

export async function handleButtonInteraction(interaction, env) {
    if (interaction.data.custom_id.startsWith('vote_')) {
        const pollId = interaction.data.custom_id.replace('vote_', '');
        
        try {
            // Add timeout protection
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Handler timeout')), 8000);
            });

            const handlerPromise = (async () => {
                const pollManager = new PollManager(env);
                const poll = await pollManager.getPoll(pollId);
                
                if (!poll) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Poll not found!',
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                if (poll.phase !== 'voting') {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `This poll is currently in the ${poll.phase} phase. Voting is not available yet.`,
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // Check if user already voted using efficient query
                const userId = interaction.member?.user?.id || interaction.user?.id;
                const existingVote = await pollManager.db.prepare(`
                    SELECT id FROM votes WHERE poll_id = ? AND user_id = ?
                `).bind(pollId, userId).first();
                
                if (existingVote) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'You have already voted in this poll!',
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // Generate voting interface based on tally method
                if (poll.tallyMethod === 'chris-style') {
                    return generateChrisStyleVotingInterface(poll, userId);
                } else {
                    return generateRankedChoiceVotingInterface(poll);
                }
            })();

            return await Promise.race([handlerPromise, timeoutPromise]);
        } catch (error) {
            console.error('Error handling vote button:', error);
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: error.message === 'Handler timeout' ? 
                        'Request timed out. Please try again.' : 
                        'An error occurred. Please try again.',
                    flags: 64
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'Unknown button interaction',
            flags: 64
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function handleSelectMenuInteraction(interaction, env) {
    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Handler timeout')), 8000);
        });

        const handlerPromise = (async () => {
            const pollManager = new PollManager(env);
            const customId = interaction.data.custom_id;
            
            if (customId.startsWith('chris_vote_')) {
                return await handleChrisStyleVoting(interaction, env, pollManager);
            }
            
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Unknown select menu interaction',
                    flags: 64
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        })();

        return await Promise.race([handlerPromise, timeoutPromise]);
    } catch (error) {
        console.error('Error handling select menu:', error);
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: error.message === 'Handler timeout' ? 
                    'Request timed out. Please try again.' : 
                    'An error occurred. Please try again.',
                flags: 64
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleModalSubmit(interaction, env) {
    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Handler timeout')), 8000);
        });

        const handlerPromise = (async () => {
            const pollManager = new PollManager(env);
            
            if (interaction.data.custom_id.startsWith('ranked_vote_')) {
                return await handleRankedChoiceSubmission(interaction, env, pollManager);
            }
            
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Unknown modal submission',
                    flags: 64
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        })();

        return await Promise.race([handlerPromise, timeoutPromise]);
    } catch (error) {
        console.error('Error handling modal submit:', error);
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: error.message === 'Handler timeout' ? 
                    'Request timed out. Please try again.' : 
                    'An error occurred. Please try again.',
                flags: 64
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleChrisStyleVoting(interaction, env, pollManager) {
    const customId = interaction.data.custom_id;
    const parts = customId.split('_');
    const position = parts[2]; // first, second, third
    const pollId = parts[3];
    const selectedValue = interaction.data.values[0];
    const userId = interaction.member?.user?.id || interaction.user?.id;
    
    // Get or create voting session
    const userKey = `${userId}_${pollId}`;
    let session = await pollManager.getVotingSession(userKey);
    
    if (!session) {
        session = {
            pollId,
            userId,
            selections: []
        };
    }
    
    // Update selection
    const existingIndex = session.selections.findIndex(s => s.position === position);
    if (existingIndex >= 0) {
        session.selections[existingIndex].bookIndex = parseInt(selectedValue);
    } else {
        session.selections.push({
            position,
            bookIndex: parseInt(selectedValue)
        });
    }
    
    // Save session
    await pollManager.setVotingSession(userKey, pollId, userId, session.selections);
    
    // Check if vote is complete
    const poll = await pollManager.getPoll(pollId);
    const requiredSelections = Math.min(3, poll.nominations.length);
    const hasAllSelections = session.selections.length >= requiredSelections;
    
    if (hasAllSelections) {
        // Submit vote
        const rankings = session.selections
            .sort((a, b) => {
                const order = { first: 0, second: 1, third: 2 };
                return order[a.position] - order[b.position];
            })
            .map(s => s.bookIndex);
        
        await pollManager.submitVote(pollId, userId, rankings);
        await pollManager.deleteVotingSession(userKey);
        
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: '✅ Your vote has been submitted successfully!',
                flags: 64
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Update interface with current selections
    return generateChrisStyleVotingInterface(poll, userId, session.selections);
}

async function handleRankedChoiceSubmission(interaction, env, pollManager) {
    const pollId = interaction.data.custom_id.replace('ranked_vote_', '');
    const userId = interaction.member?.user?.id || interaction.user?.id;
    
    // Parse rankings from modal input
    const rankingsInput = interaction.data.components[0].components[0].value;
    const rankings = rankingsInput.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
    
    await pollManager.submitVote(pollId, userId, rankings);
    
    return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: '✅ Your vote has been submitted successfully!',
            flags: 64
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

function generateChrisStyleVotingInterface(poll, userId, existingSelections = []) {
    const components = [];
    const nominations = poll.nominations;
    const maxSelections = Math.min(3, nominations.length);
    
    const positions = ['first', 'second', 'third'].slice(0, maxSelections);
    
    positions.forEach((position, index) => {
        const currentSelection = existingSelections.find(s => s.position === position);
        const options = nominations.map((nom, idx) => ({
            label: nom.title.substring(0, 100),
            value: (idx + 1).toString(),
            description: nom.author ? `by ${nom.author}`.substring(0, 100) : undefined,
            default: currentSelection?.bookIndex === (idx + 1)
        }));
        
        components.push({
            type: 1, // Action Row
            components: [{
                type: 3, // Select Menu
                custom_id: `chris_vote_${position}_${poll.id}`,
                placeholder: `Select your ${position} choice`,
                options
            }]
        });
    });
    
    const selectedCount = existingSelections.length;
    const statusText = selectedCount > 0 ? 
        `Selected ${selectedCount}/${maxSelections} choices` : 
        'Make your selections below';
    
    return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: `📊 **Chris-Style Voting** - ${poll.title}\n\n${statusText}`,
            components,
            flags: 64
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

function generateRankedChoiceVotingInterface(poll) {
    const nominations = poll.nominations;
    const nominationsList = nominations.map((nom, idx) => 
        `${idx + 1}. **${nom.title}** ${nom.author ? `by ${nom.author}` : ''}`
    ).join('\n');
    
    return new Response(JSON.stringify({
        type: InteractionResponseType.MODAL,
        data: {
            title: 'Ranked Choice Voting',
            custom_id: `ranked_vote_${poll.id}`,
            components: [{
                type: 1, // Action Row
                components: [{
                    type: 4, // Text Input
                    custom_id: 'rankings',
                    label: 'Enter your rankings (comma-separated numbers)',
                    style: 2, // Paragraph
                    placeholder: 'Example: 3,1,2 (ranks book 3 first, book 1 second, book 2 third)',
                    required: true,
                    max_length: 100
                }]
            }]
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}