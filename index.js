const { Client, GatewayIntentBits, Collection, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { initializeFirebase } = require('./services/firebase');
const { startScheduler } = require('./services/scheduler');
const config = require('./config/config');
const pollManager = require('./services/pollManager');
const http = require('http');

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const pollCommand = require('./commands/poll');
client.commands.set(pollCommand.data.name, pollCommand);

// Client ready event
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    
    // Initialize Firebase
    try {
        await initializeFirebase();
        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        process.exit(1);
    }
    
    // Start scheduler for poll phase transitions
    startScheduler(client);
    console.log('✅ Scheduler started');
    
    // Register slash commands
    await registerCommands();
});

// Interaction handler
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);
            const errorMessage = 'There was an error while executing this command!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
    } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction);
    }
});

// Handle button interactions
async function handleButtonInteraction(interaction) {
    if (interaction.customId.startsWith('vote_')) {
        const pollId = interaction.customId.replace('vote_', '');
        
        try {
            const poll = await pollManager.getPoll(pollId);
            if (!poll) {
                return await interaction.reply({
                    content: 'Poll not found!',
                    ephemeral: true
                });
            }
            
            if (poll.phase !== 'voting') {
                return await interaction.reply({
                    content: `This poll is currently in the ${poll.phase} phase. Voting is not available yet.`,
                    ephemeral: true
                });
            }
            
            // Check if user already voted
            const existingVote = poll.votes ? poll.votes.find(v => v.userId === interaction.user.id) : null;
            if (existingVote) {
                return await interaction.reply({
                    content: 'You have already voted in this poll!',
                    ephemeral: true
                });
            }
            
            // For chris-style voting, use dropdown menus instead of modal
            if (poll.tallyMethod === 'chris-style') {
                const maxBooks = poll.nominations.length;
                const requiredChoices = Math.min(3, maxBooks);
                
                // Create book options for dropdowns
                const bookOptions = poll.nominations.map((book, index) => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${book.title}`)
                        .setDescription(`${book.author ? `by ${book.author}` : 'Book nomination'}`)
                        .setValue(`${index + 1}`)
                );
                
                // Create dropdown components
                const components = [];
                
                // First choice dropdown (always visible)
                const firstChoiceMenu = new StringSelectMenuBuilder()
                    .setCustomId(`first_choice_${pollId}`)
                    .setPlaceholder('Select your first choice')
                    .addOptions(bookOptions);
                
                components.push(new ActionRowBuilder().addComponents(firstChoiceMenu));
                
                // Second choice dropdown (visible if 2+ nominations)
                if (maxBooks >= 2) {
                    const secondChoiceMenu = new StringSelectMenuBuilder()
                        .setCustomId(`second_choice_${pollId}`)
                        .setPlaceholder('Select your second choice')
                        .addOptions(bookOptions);
                    
                    components.push(new ActionRowBuilder().addComponents(secondChoiceMenu));
                }
                
                // Third choice dropdown (visible if 3+ nominations)
                if (maxBooks >= 3) {
                    const thirdChoiceMenu = new StringSelectMenuBuilder()
                        .setCustomId(`third_choice_${pollId}`)
                        .setPlaceholder('Select your third choice')
                        .addOptions(bookOptions);
                    
                    components.push(new ActionRowBuilder().addComponents(thirdChoiceMenu));
                }
                
                const pointsText = requiredChoices === 3 ? '1st=3pts, 2nd=2pts, 3rd=1pt' :
                                 requiredChoices === 2 ? '1st=2pts, 2nd=1pt' : '1st=1pt';
                
                const embed = new EmbedBuilder()
                    .setTitle(`Vote: ${poll.title}`)
                    .setDescription(`Select your top ${requiredChoices} book${requiredChoices > 1 ? 's' : ''} in order of preference.\n\n**Scoring:** ${pointsText}`)
                    .addFields({
                        name: 'Instructions',
                        value: `Choose ${requiredChoices === 1 ? 'your favorite book' : `up to ${requiredChoices} different books`}. Each choice must be different.`
                    })
                    .setColor('#0099FF');
                
                await interaction.reply({
                    embeds: [embed],
                    components: components,
                    ephemeral: true
                });
                
            } else {
                // Use modal for ranked choice voting
                const modal = new ModalBuilder()
                    .setCustomId(`vote_modal_${pollId}`)
                    .setTitle(`Vote: ${poll.title}`);
                
                const rankingInput = new TextInputBuilder()
                    .setCustomId('rankings')
                    .setLabel('Enter your rankings (e.g., 2,1,3)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter rankings separated by commas')
                    .setRequired(true)
                    .setMaxLength(50);
                
                const instructionText = poll.nominations.map((book, index) => 
                    `${index + 1}. ${book.title}`
                ).join('\n');
                
                const instructionInput = new TextInputBuilder()
                    .setCustomId('instructions')
                    .setLabel('Book Options (Reference Only)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(instructionText)
                    .setRequired(false);
                
                modal.addComponents(
                    new ActionRowBuilder().addComponents(rankingInput),
                    new ActionRowBuilder().addComponents(instructionInput)
                );
                
                await interaction.showModal(modal);
            }
            
        } catch (error) {
            console.error('Error handling vote button:', error);
            await interaction.reply({
                content: `Error: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

// Store user voting selections temporarily
const userVoteSelections = new Map();

// Handle select menu interactions
async function handleSelectMenuInteraction(interaction) {
    const customId = interaction.customId;
    
    if (customId.startsWith('first_choice_') || customId.startsWith('second_choice_') || customId.startsWith('third_choice_')) {
        const parts = customId.split('_');
        const choiceType = parts[0]; // 'first', 'second', or 'third'
        const actualPollId = parts.slice(2).join('_'); // everything after 'choice_'
        
        try {
            const poll = await pollManager.getPoll(actualPollId);
            if (!poll) {
                return await interaction.reply({
                    content: 'Poll not found!',
                    ephemeral: true
                });
            }
            
            // Check if user already voted
            const existingVote = poll.votes ? poll.votes.find(v => v.userId === interaction.user.id) : null;
            if (existingVote) {
                return await interaction.reply({
                    content: 'You have already voted in this poll!',
                    ephemeral: true
                });
            }
            
            const selectedValue = interaction.values[0];
            const userKey = `${interaction.user.id}_${actualPollId}`;
            
            // Initialize or get existing selections
            if (!userVoteSelections.has(userKey)) {
                userVoteSelections.set(userKey, {});
            }
            const selections = userVoteSelections.get(userKey);
            
            // Update the specific choice
            selections[choiceType] = selectedValue;
            
            const maxBooks = poll.nominations.length;
            const requiredChoices = Math.min(3, maxBooks);
            
            // Check if we have enough selections to submit vote
            const currentSelections = Object.keys(selections).length;
            const choiceTypes = ['first', 'second', 'third'].slice(0, requiredChoices);
            const hasAllRequired = choiceTypes.every(type => selections[type]);
            
            if (hasAllRequired) {
                // Validate no duplicates
                const values = Object.values(selections);
                const uniqueValues = [...new Set(values)];
                
                if (uniqueValues.length !== values.length) {
                    return await interaction.reply({
                        content: 'Each choice must be different! Please select different books for each position.',
                        ephemeral: true
                    });
                }
                
                // Convert selections to rankings array for submission
                const rankings = [];
                for (const type of choiceTypes) {
                    rankings.push(parseInt(selections[type]));
                }
                
                // Submit the vote
                await pollManager.submitVote(actualPollId, interaction.user.id, rankings);
                
                // Clean up temporary selections
                userVoteSelections.delete(userKey);
                
                await interaction.reply({
                    content: '✅ Your vote has been recorded anonymously!',
                    ephemeral: true
                });
                
                // Check if all members have voted for auto-completion
                const completedPoll = await pollManager.getPoll(actualPollId);
                if (completedPoll.phase === 'completed') {
                    const resultsEmbed = new EmbedBuilder()
                        .setTitle('🏆 Poll Completed - All Members Voted!')
                        .setDescription(`Poll: **${completedPoll.title}**`)
                        .addFields({
                            name: '🥇 Winner',
                            value: completedPoll.results.winner ? 
                                `**${completedPoll.results.winner.title}**\n[Link](${completedPoll.results.winner.link})` : 
                                'No clear winner'
                        })
                        .setColor('#FFD700')
                        .setTimestamp();
                    
                    await interaction.channel.send({ embeds: [resultsEmbed] });
                }
                
            } else {
                // Show current selection status
                const selectionStatus = choiceTypes.map(type => {
                    const bookNum = selections[type];
                    const bookTitle = bookNum ? poll.nominations[parseInt(bookNum) - 1]?.title : 'Not selected';
                    const choiceName = type.charAt(0).toUpperCase() + type.slice(1);
                    return `${choiceName} choice: ${bookTitle}`;
                }).join('\n');
                
                const remaining = requiredChoices - currentSelections;
                await interaction.reply({
                    content: `Selection updated!\n\n**Current selections:**\n${selectionStatus}\n\n${remaining > 0 ? `Please make ${remaining} more selection${remaining > 1 ? 's' : ''} to submit your vote.` : 'Ready to submit!'}`,
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error handling select menu:', error);
            await interaction.reply({
                content: `Error: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

// Handle modal submissions
async function handleModalSubmit(interaction) {
    if (interaction.customId.startsWith('vote_modal_')) {
        const pollId = interaction.customId.replace('vote_modal_', '');
        
        try {
            const poll = await pollManager.getPoll(pollId);
            if (!poll) {
                return await interaction.reply({
                    content: 'Poll not found!',
                    ephemeral: true
                });
            }
            
            const rankingsInput = interaction.fields.getTextInputValue('rankings');
            const rankings = rankingsInput.split(',').map(r => parseInt(r.trim()));
            
            // Validate rankings based on tally method
            if (poll.tallyMethod === 'chris-style') {
                const maxBookNumber = poll.nominations.length;
                const requiredChoices = Math.min(3, maxBookNumber);
                
                // Chris-style: exactly 3 choices (or all books if fewer than 3)
                if (rankings.length !== requiredChoices) {
                    return await interaction.reply({
                        content: `Chris-style voting requires exactly ${requiredChoices} book${requiredChoices > 1 ? 's' : ''}! You entered ${rankings.length}.`,
                        ephemeral: true
                    });
                }
                
                // Check for valid book numbers
                for (const ranking of rankings) {
                    if (ranking < 1 || ranking > maxBookNumber) {
                        return await interaction.reply({
                            content: `Invalid book number: ${ranking}. Please use numbers 1-${maxBookNumber}.`,
                            ephemeral: true
                        });
                    }
                }
                
                // Check for duplicates
                const uniqueRankings = [...new Set(rankings)];
                if (uniqueRankings.length !== requiredChoices) {
                    return await interaction.reply({
                        content: `Each book can only be chosen once! Please pick ${requiredChoices} different books.`,
                        ephemeral: true
                    });
                }
            } else {
                // Ranked choice: rank all books
                if (rankings.length !== poll.nominations.length) {
                    return await interaction.reply({
                        content: `Please rank all ${poll.nominations.length} books!`,
                        ephemeral: true
                    });
                }
                
                const validNumbers = Array.from({length: poll.nominations.length}, (_, i) => i + 1);
                const sortedRankings = [...rankings].sort();
                
                if (sortedRankings.join(',') !== validNumbers.join(',')) {
                    return await interaction.reply({
                        content: `Please use each number from 1 to ${poll.nominations.length} exactly once!`,
                        ephemeral: true
                    });
                }
            }
            
            await pollManager.submitVote(pollId, interaction.user.id, rankings);
            
            await interaction.reply({
                content: '✅ Your vote has been recorded anonymously!',
                ephemeral: true
            });
            
            // Get updated poll to calculate vote percentage
            const updatedPoll = await pollManager.getPoll(pollId);
            const totalVotes = updatedPoll.votes ? updatedPoll.votes.length : 0;
            
            // Get actual server member count (excluding bots)
            const guild = interaction.guild;
            const guildMembers = await guild.members.fetch();
            const humanMembers = guildMembers.filter(member => !member.user.bot);
            const totalMembers = humanMembers.size;
            const votePercentage = Math.round((totalVotes / totalMembers) * 100);
            
            // Announce vote progress
            const progressEmbed = new EmbedBuilder()
                .setTitle('🗳️ Vote Progress Update')
                .setDescription(`**${votePercentage}%** of members have voted (${totalVotes}/${totalMembers})`)
                .addFields({ name: 'Poll', value: updatedPoll.title })
                .setColor('#FF9900')
                .setTimestamp();
            
            await interaction.channel.send({ embeds: [progressEmbed] });
            
            // Check if all members have voted and complete poll if so
            const allVoted = await pollManager.checkIfAllVoted(pollId);
            if (allVoted) {
                await pollManager.completePoll(pollId);
                
                const completedPoll = await pollManager.getPoll(pollId);
                const resultsEmbed = new EmbedBuilder()
                    .setTitle('🏆 Poll Completed - All Members Voted!')
                    .setDescription(`Poll: **${completedPoll.title}**`)
                    .addFields({
                        name: '🥇 Winner',
                        value: completedPoll.results.winner ? 
                            `**${completedPoll.results.winner.title}**\n[Link](${completedPoll.results.winner.link})` : 
                            'No clear winner'
                    })
                    .setColor('#FFD700')
                    .setTimestamp();
                
                await interaction.channel.send({ embeds: [resultsEmbed] });
            }
            
        } catch (error) {
            console.error('Error processing vote modal:', error);
            await interaction.reply({
                content: `Error: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

// Register slash commands
async function registerCommands() {
    const commands = [];
    
    // Add poll command
    commands.push(pollCommand.data.toJSON());
    
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    
    try {
        console.log('Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(config.discord.clientId),
            { body: commands }
        );
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Create health check server
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            bot: client.isReady() ? 'connected' : 'connecting',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

healthServer.listen(8080, '0.0.0.0', () => {
    console.log('Health check server running on port 8080');
});

// Start the bot
console.log('Attempting to login with token length:', config.discord.token?.length);
client.login(config.discord.token).catch(error => {
    console.error('Login failed:', error.message);
    if (error.code === 'TokenInvalid') {
        console.error('The Discord token appears to be invalid. Please check:');
        console.error('1. The token is from the correct bot application');
        console.error('2. The token hasn\'t been regenerated in Discord Developer Portal');
        console.error('3. The token has no extra spaces or characters');
    }
});
