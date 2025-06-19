// Serverless interaction handlers for Cloudflare Workers
import { InteractionResponseType } from 'discord-interactions';
import { PollManager } from '../services/pollManager.js';

// Store user voting selections temporarily in KV
const userVoteSelections = new Map();

export async function handleButtonInteraction(interaction, env) {
    if (interaction.data.custom_id.startsWith('vote_')) {
        const pollId = interaction.data.custom_id.replace('vote_', '');
        
        try {
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
            
            // Check if user already voted
            const existingVote = poll.votes ? poll.votes.find(v => v.userId === interaction.member.user.id) : null;
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
            
            // For chris-style voting, use dropdown menus
            if (poll.tallyMethod === 'chris-style') {
                const maxBooks = poll.nominations.length;
                const requiredChoices = Math.min(3, maxBooks);
                
                // Create book options for dropdowns
                const bookOptions = poll.nominations.map((book, index) => ({
                    label: book.title,
                    description: book.author ? `by ${book.author}` : 'Book nomination',
                    value: `${index + 1}`
                }));
                
                // Create dropdown components
                const components = [];
                
                // First choice dropdown (always visible)
                components.push({
                    type: 1, // Action Row
                    components: [{
                        type: 3, // Select Menu
                        custom_id: `first_choice_${pollId}`,
                        placeholder: 'Select your first choice',
                        options: bookOptions
                    }]
                });
                
                // Second choice dropdown (visible if 2+ nominations)
                if (maxBooks >= 2) {
                    components.push({
                        type: 1, // Action Row
                        components: [{
                            type: 3, // Select Menu
                            custom_id: `second_choice_${pollId}`,
                            placeholder: 'Select your second choice',
                            options: bookOptions
                        }]
                    });
                }
                
                // Third choice dropdown (visible if 3+ nominations)
                if (maxBooks >= 3) {
                    components.push({
                        type: 1, // Action Row
                        components: [{
                            type: 3, // Select Menu
                            custom_id: `third_choice_${pollId}`,
                            placeholder: 'Select your third choice',
                            options: bookOptions
                        }]
                    });
                }
                
                const pointsText = requiredChoices === 3 ? '1st=3pts, 2nd=2pts, 3rd=1pt' :
                                 requiredChoices === 2 ? '1st=2pts, 2nd=1pt' : '1st=1pt';
                
                const embed = {
                    title: `Vote: ${poll.title}`,
                    description: `Select your top ${requiredChoices} book${requiredChoices > 1 ? 's' : ''} in order of preference.\n\n**Scoring:** ${pointsText}`,
                    color: 0x0099FF,
                    fields: [{
                        name: 'Instructions',
                        value: `Choose ${requiredChoices === 1 ? 'your favorite book' : `up to ${requiredChoices} different books`}. Each choice must be different.`
                    }]
                };
                
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [embed],
                        components: components,
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
                
            } else {
                // Use modal for ranked choice voting
                const modal = {
                    title: `Vote: ${poll.title}`,
                    custom_id: `vote_modal_${pollId}`,
                    components: [
                        {
                            type: 1, // Action Row
                            components: [{
                                type: 4, // Text Input
                                custom_id: 'rankings',
                                label: 'Enter your rankings (e.g., 2,1,3)',
                                style: 1, // Short
                                placeholder: 'Enter rankings separated by commas',
                                required: true,
                                max_length: 50
                            }]
                        },
                        {
                            type: 1, // Action Row
                            components: [{
                                type: 4, // Text Input
                                custom_id: 'instructions',
                                label: 'Book Options (Reference Only)',
                                style: 2, // Paragraph
                                value: poll.nominations.map((book, index) => 
                                    `${index + 1}. ${book.title}`
                                ).join('\n'),
                                required: false
                            }]
                        }
                    ]
                };
                
                return new Response(JSON.stringify({
                    type: InteractionResponseType.MODAL,
                    data: modal
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
        } catch (error) {
            console.error('Error handling vote button:', error);
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `Error: ${error.message}`,
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    return new Response(JSON.stringify({ error: 'Unknown button interaction' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function handleSelectMenuInteraction(interaction, env) {
    const customId = interaction.data.custom_id;
    
    if (customId.startsWith('first_choice_') || customId.startsWith('second_choice_') || customId.startsWith('third_choice_')) {
        const parts = customId.split('_');
        const choiceType = parts[0]; // 'first', 'second', or 'third'
        const actualPollId = parts.slice(2).join('_'); // everything after 'choice_'
        
        try {
            const pollManager = new PollManager(env);
            const poll = await pollManager.getPoll(actualPollId);
            
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
            
            // Check if user already voted
            const userId = interaction.member.user.id;
            const existingVote = poll.votes ? poll.votes.find(v => v.userId === userId) : null;
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
            
            const selectedValue = interaction.data.values[0];
            const userKey = `${userId}_${actualPollId}`;
            
            // Store selection in KV (or memory for now)
            if (!userVoteSelections.has(userKey)) {
                userVoteSelections.set(userKey, {});
            }
            const selections = userVoteSelections.get(userKey);
            
            // Update the specific choice
            selections[choiceType] = selectedValue;
            
            const maxBooks = poll.nominations.length;
            const requiredChoices = Math.min(3, maxBooks);
            
            // Check if we have enough selections to submit vote
            const choiceTypes = ['first', 'second', 'third'].slice(0, requiredChoices);
            const hasAllRequired = choiceTypes.every(type => selections[type]);
            
            if (hasAllRequired) {
                // Validate no duplicates
                const values = Object.values(selections);
                const uniqueValues = [...new Set(values)];
                
                if (uniqueValues.length !== values.length) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Each choice must be different! Please select different books for each position.',
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // Convert selections to rankings array for submission
                const rankings = [];
                for (const type of choiceTypes) {
                    rankings.push(parseInt(selections[type]));
                }
                
                // Submit the vote
                await pollManager.submitVote(actualPollId, userId, rankings);
                
                // Clean up temporary selections
                userVoteSelections.delete(userKey);
                
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: '✅ Your vote has been recorded anonymously!',
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
                
            } else {
                // Show current selection status
                const selectionStatus = choiceTypes.map(type => {
                    const bookNum = selections[type];
                    const bookTitle = bookNum ? poll.nominations[parseInt(bookNum) - 1]?.title : 'Not selected';
                    const choiceName = type.charAt(0).toUpperCase() + type.slice(1);
                    return `${choiceName} choice: ${bookTitle}`;
                }).join('\n');
                
                const currentSelections = Object.keys(selections).length;
                const remaining = requiredChoices - currentSelections;
                
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `Selection updated!\n\n**Current selections:**\n${selectionStatus}\n\n${remaining > 0 ? `Please make ${remaining} more selection${remaining > 1 ? 's' : ''} to submit your vote.` : 'Ready to submit!'}`,
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
        } catch (error) {
            console.error('Error handling select menu:', error);
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `Error: ${error.message}`,
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    return new Response(JSON.stringify({ error: 'Unknown select menu interaction' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function handleModalSubmit(interaction, env) {
    if (interaction.data.custom_id.startsWith('vote_modal_')) {
        const pollId = interaction.data.custom_id.replace('vote_modal_', '');
        
        try {
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
            
            const rankingsInput = interaction.data.components[0].components[0].value;
            const rankings = rankingsInput.split(',').map(r => parseInt(r.trim()));
            
            // Validate rankings based on tally method
            if (poll.tallyMethod === 'chris-style') {
                const maxBooks = poll.nominations.length;
                const requiredChoices = Math.min(3, maxBooks);
                
                if (rankings.length !== requiredChoices) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `Please pick exactly ${requiredChoices} book${requiredChoices > 1 ? 's' : ''}!`,
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // Validate book numbers
                const maxBookNumber = poll.nominations.length;
                for (const ranking of rankings) {
                    if (ranking < 1 || ranking > maxBookNumber) {
                        return new Response(JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: `Invalid book number: ${ranking}. Please use numbers 1-${maxBookNumber}.`,
                                flags: 64 // Ephemeral
                            }
                        }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
                
                // Check for duplicates
                const uniqueRankings = [...new Set(rankings)];
                if (uniqueRankings.length !== requiredChoices) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `Each book can only be chosen once! Please pick ${requiredChoices} different books.`,
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } else {
                // Ranked choice: rank all books
                if (rankings.length !== poll.nominations.length) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `Please rank all ${poll.nominations.length} books!`,
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                const validNumbers = Array.from({length: poll.nominations.length}, (_, i) => i + 1);
                const sortedRankings = [...rankings].sort();
                
                if (sortedRankings.join(',') !== validNumbers.join(',')) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `Please use each number from 1 to ${poll.nominations.length} exactly once!`,
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
            
            await pollManager.submitVote(pollId, interaction.member.user.id, rankings);
            
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '✅ Your vote has been recorded anonymously!',
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
            
        } catch (error) {
            console.error('Error processing vote modal:', error);
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `Error: ${error.message}`,
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    return new Response(JSON.stringify({ error: 'Unknown modal interaction' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
    });
}