const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createPoll, nominateBook, submitVote, getPoll, getAllPolls, getActivePolls, updatePollPhase, completePoll, removeNomination, getGuildMemberCount } = require('../services/pollManager');
const pollManager = require('../services/pollManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Manage book polls')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new book poll')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title of the poll')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nomination_end')
                        .setDescription('Nomination end date (YYYY-MM-DD HH:MM)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('voting_end')
                        .setDescription('Voting end date (YYYY-MM-DD HH:MM)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the poll')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('tally_method')
                        .setDescription('Voting method (ranked-choice or chris-style)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Ranked Choice (IRV)', value: 'ranked-choice' },
                            { name: 'Chris Style (Top 3 Points)', value: 'chris-style' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nominate')
                .setDescription('Nominate a book for the active poll')
                .addStringOption(option =>
                    option.setName('book_title')
                        .setDescription('Title of the book')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('book_link')
                        .setDescription('Link to the book')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Brief description of the book')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID (optional if only one active poll)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('vote')
                .setDescription('Vote in a poll (opens voting interface)')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID (optional if only one active voting poll)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of a poll')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID (optional if only one active poll)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end-nominations')
                .setDescription('End the nomination period early (creator only)')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID (optional if only one active poll)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end-voting')
                .setDescription('End the voting period early and announce results (creator only)')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID (optional if only one active poll)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-nomination')
                .setDescription('Remove a book nomination (creator only)')
                .addIntegerOption(option =>
                    option.setName('nomination_number')
                        .setDescription('The number of the nomination to remove (see poll status)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID (optional if only one active poll)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw-nomination')
                .setDescription('Remove your own nomination from a poll')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID (optional if only one active poll)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all polls')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'create':
                await handleCreatePoll(interaction);
                break;
            case 'nominate':
                await handleNominate(interaction);
                break;
            case 'vote':
                await handleVote(interaction);
                break;
            case 'status':
                await handleStatus(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'end-nominations':
                await handleEndNominations(interaction);
                break;
            case 'end-voting':
                await handleEndVoting(interaction);
                break;
            case 'remove-nomination':
                await handleRemoveNomination(interaction);
                break;
            case 'withdraw-nomination':
                await handleWithdrawNomination(interaction);
                break;
        }
    }
};

async function handleCreatePoll(interaction) {
    const title = interaction.options.getString('title');
    const nominationEnd = interaction.options.getString('nomination_end');
    const votingEnd = interaction.options.getString('voting_end');
    const description = interaction.options.getString('description') || '';
    const tallyMethod = interaction.options.getString('tally_method') || 'ranked-choice';
    
    try {
        // Parse dates
        const nominationEndDate = new Date(nominationEnd);
        const votingEndDate = new Date(votingEnd);
        const now = new Date();
        
        // Validate dates
        if (nominationEndDate <= now) {
            return await interaction.reply({
                content: '❌ Nomination end date must be in the future!',
                ephemeral: true
            });
        }
        
        if (votingEndDate <= nominationEndDate) {
            return await interaction.reply({
                content: '❌ Voting end date must be after nomination end date!',
                ephemeral: true
            });
        }
        
        const pollId = await createPoll({
            title,
            description,
            nominationEnd: nominationEndDate,
            votingEnd: votingEndDate,
            createdBy: interaction.user.id,
            guildId: interaction.guildId,
            tallyMethod: tallyMethod
        });
        
        const tallyMethodDisplay = tallyMethod === 'chris-style' ? 'Chris Style (Top 3 Points)' : 'Ranked Choice (IRV)';
        
        const embed = new EmbedBuilder()
            .setTitle('📚 New Book Poll Created!')
            .setDescription(`**${title}**\n${description}`)
            .addFields(
                { name: '🆔 Poll ID', value: pollId, inline: true },
                { name: '📊 Tally Method', value: tallyMethodDisplay, inline: true },
                { name: '📝 Nominations Close', value: `<t:${Math.floor(nominationEndDate.getTime() / 1000)}:F>`, inline: false },
                { name: '🗳️ Voting Closes', value: `<t:${Math.floor(votingEndDate.getTime() / 1000)}:F>`, inline: false }
            )
            .setColor('#00FF00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error creating poll:', error);
        await interaction.reply({
            content: '❌ Failed to create poll. Please check your date format (YYYY-MM-DD HH:MM).',
            ephemeral: true
        });
    }
}

async function handleNominate(interaction) {
    let pollId = interaction.options.getString('poll_id');
    const bookTitle = interaction.options.getString('book_title');
    const bookLink = interaction.options.getString('book_link');
    const description = interaction.options.getString('description') || '';
    
    try {
        // If no poll_id provided, try to find the single active poll for this guild
        if (!pollId) {
            const singleActivePoll = await pollManager.getSingleActivePoll(interaction.guildId);
            
            if (singleActivePoll && singleActivePoll.phase === 'nomination') {
                pollId = singleActivePoll.id;
            } else {
                // Fallback to manual selection
                const activePolls = await getActivePolls();
                const guildNominationPolls = activePolls.filter(poll => 
                    poll.guildId === interaction.guildId && poll.phase === 'nomination'
                );
                
                if (guildNominationPolls.length === 0) {
                    return await interaction.reply({
                        content: '❌ No active nomination polls found in this server. Please specify a poll ID or create a new poll first.',
                        ephemeral: true
                    });
                }
                
                const pollList = guildNominationPolls.map(poll => `\`${poll.id}\` - ${poll.title}`).join('\n');
                return await interaction.reply({
                    content: `❌ Multiple active polls found. Please specify which poll:\n${pollList}`,
                    ephemeral: true
                });
            }
        }
        
        await nominateBook(pollId, {
            title: bookTitle,
            link: bookLink,
            description,
            nominatedBy: interaction.user.id,
            nominatedAt: new Date()
        });
        
        const poll = await pollManager.getPoll(pollId);
        
        // Public announcement
        const publicEmbed = new EmbedBuilder()
            .setTitle('📚 New Book Nomination!')
            .setDescription(`<@${interaction.user.id}> has nominated **${bookTitle}**`)
            .addFields(
                { name: '🔗 Link', value: bookLink },
                { name: '📝 Description', value: description || 'No description provided' },
                { name: '📊 Poll', value: poll.title }
            )
            .setColor('#00FF00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [publicEmbed] });
        
    } catch (error) {
        console.error('Error nominating book:', error);
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleVote(interaction) {
    let pollId = interaction.options.getString('poll_id');
    
    try {
        // If no poll_id provided, try to find the single active voting poll for this guild
        if (!pollId) {
            const singleActivePoll = await pollManager.getSingleActivePoll(interaction.guildId);
            
            if (singleActivePoll && singleActivePoll.phase === 'voting') {
                pollId = singleActivePoll.id;
            } else {
                // Fallback to manual selection
                const activePolls = await getActivePolls();
                const guildVotingPolls = activePolls.filter(poll => 
                    poll.guildId === interaction.guildId && poll.phase === 'voting'
                );
                
                if (guildVotingPolls.length === 0) {
                    return await interaction.reply({
                        content: '❌ No active voting polls found in this server. Please specify a poll ID or wait for the nomination phase to end.',
                        ephemeral: true
                    });
                }
                
                const pollList = guildVotingPolls.map(poll => `\`${poll.id}\` - ${poll.title}`).join('\n');
                return await interaction.reply({
                    content: `❌ Multiple active voting polls found. Please specify which poll:\n${pollList}`,
                    ephemeral: true
                });
            }
        }
        
        const poll = await getPoll(pollId);
        
        if (!poll) {
            return await interaction.reply({
                content: '❌ Poll not found!',
                ephemeral: true
            });
        }
        
        if (poll.phase !== 'voting') {
            return await interaction.reply({
                content: `❌ This poll is currently in the ${poll.phase} phase. Voting is not available yet.`,
                ephemeral: true
            });
        }
        
        if (poll.nominations.length === 0) {
            return await interaction.reply({
                content: '❌ No books have been nominated for this poll yet!',
                ephemeral: true
            });
        }
        
        // Create voting interface with modal
        const embed = new EmbedBuilder()
            .setTitle(`🗳️ Voting: ${poll.title}`)
            .setDescription('Rank the books in order of preference (1 = most preferred)\n\nClick the "Vote" button below to open a private voting form.')
            .setColor('#0099FF');
        
        // Add nominated books
        poll.nominations.forEach((book, index) => {
            embed.addFields({
                name: `${index + 1}. ${book.title}`,
                value: `[Link](${book.link})\n${book.description || 'No description'}`,
                inline: false
            });
        });

        // Create vote button
        const voteButton = new ButtonBuilder()
            .setCustomId(`vote_${pollId}`)
            .setLabel('📊 Vote')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(voteButton);
        
        await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            ephemeral: true 
        });

        
    } catch (error) {
        console.error('Error handling vote:', error);
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleStatus(interaction) {
    let pollId = interaction.options.getString('poll_id');
    
    try {
        // Defer the reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });
        // Auto-detect poll if not provided - prioritize active polls
        if (!pollId) {
            const singleActivePoll = await pollManager.getSingleActivePoll(interaction.guildId);
            
            if (singleActivePoll) {
                pollId = singleActivePoll.id;
            } else {
                // Fallback to showing all polls if no single active poll
                const allPolls = await pollManager.getAllPolls(interaction.guildId);
                
                if (allPolls.length === 0) {
                    return await interaction.followUp({
                        content: 'No polls found in this server.',
                        ephemeral: true
                    });
                }
                
                if (allPolls.length === 1) {
                    pollId = allPolls[0].id;
                } else {
                    const pollList = allPolls.map(poll => `\`${poll.id}\` - ${poll.title} (${poll.phase})`).join('\n');
                    return await interaction.followUp({
                        content: `Multiple polls found. Please specify which poll:\n${pollList}`,
                        ephemeral: true
                    });
                }
            }
        }
        
        const poll = await getPoll(pollId);
        
        if (!poll) {
            return await interaction.reply({
                content: '❌ Poll not found!',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 Poll Status: ${poll.title}`)
            .setDescription(poll.description || 'No description')
            .setColor('#0099FF')
            .setTimestamp();

        // Basic poll information
        embed.addFields(
            { name: '📍 Current Phase', value: poll.phase.charAt(0).toUpperCase() + poll.phase.slice(1), inline: true },
            { name: '📝 Nominations', value: poll.nominations.length.toString(), inline: true },
            { name: '🗳️ Votes', value: poll.votes ? poll.votes.length.toString() : '0', inline: true }
        );

        // Add vote percentage for voting phase
        if (poll.phase === 'voting') {
            const totalVotes = poll.votes ? poll.votes.length : 0;
            
            try {
                // Get actual server member count (excluding bots) with timeout
                const guild = interaction.guild;
                const guildMembers = await Promise.race([
                    guild.members.fetch(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                const humanMembers = guildMembers.filter(member => !member.user.bot);
                const totalMembers = humanMembers.size;
                const votePercentage = Math.round((totalVotes / totalMembers) * 100);
                
                embed.addFields({
                    name: '📊 Vote Progress',
                    value: `**${votePercentage}%** complete (${totalVotes}/${totalMembers} members)`,
                    inline: false
                });
            } catch (error) {
                // Fallback to just showing vote count if member fetching fails
                embed.addFields({
                    name: '📊 Vote Progress',
                    value: `${totalVotes} votes received`,
                    inline: false
                });
            }
        }

        // Add timestamps
        embed.addFields(
            { name: '📅 Nomination End', value: `<t:${Math.floor(poll.nominationEnd.getTime() / 1000)}:F>`, inline: false },
            { name: '📅 Voting End', value: `<t:${Math.floor(poll.votingEnd.getTime() / 1000)}:F>`, inline: false }
        );

        // Add numbered nominations list
        if (poll.nominations.length > 0) {
            const nominationsList = poll.nominations.map((nomination, index) => 
                `${index + 1}. **${nomination.title}**\n   [Link](${nomination.link})\n   ${nomination.description || 'No description'}`
            ).join('\n\n');
            
            embed.addFields({
                name: '📚 Nominated Books',
                value: nominationsList.length > 1024 ? nominationsList.substring(0, 1021) + '...' : nominationsList,
                inline: false
            });
        }
        
        if (poll.phase === 'completed' && poll.results) {
            // Winner
            embed.addFields({
                name: '🏆 Winner',
                value: poll.results.winner ? `**${poll.results.winner.title}**\n[Link](${poll.results.winner.link})` : 'No winner determined',
                inline: false
            });
            
            // Final standings with runners-up
            if (poll.results.finalStandings && poll.results.finalStandings.length > 1) {
                let standingsText = '';
                poll.results.finalStandings.forEach((candidate, index) => {
                    const position = index + 1;
                    const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '📍';
                    const votes = candidate.finalVotes || 0;
                    const percentage = candidate.finalPercentage || '0.0';
                    standingsText += `${emoji} **${candidate.title}**: ${votes} votes (${percentage}%)\n`;
                });
                
                embed.addFields({
                    name: '📊 Final Results',
                    value: standingsText.trim(),
                    inline: false
                });
            }
        }
        
        await interaction.followUp({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error getting poll status:', error);
        try {
            await interaction.followUp({
                content: `❌ ${error.message}`,
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Error sending follow-up:', followUpError);
        }
    }
}

async function handleList(interaction) {
    try {
        const polls = await getAllPolls(interaction.guildId);
        
        if (polls.length === 0) {
            return await interaction.reply({
                content: '📚 No polls found in this server.',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📚 Book Polls')
            .setColor('#0099FF')
            .setTimestamp();
        
        polls.forEach(poll => {
            const status = poll.phase === 'completed' ? '✅' : 
                          poll.phase === 'voting' ? '🗳️' : '📝';
            
            embed.addFields({
                name: `${status} ${poll.title}`,
                value: `ID: \`${poll.id}\` | Phase: ${poll.phase} | Nominations: ${poll.nominations.length}`,
                inline: false
            });
        });
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error listing polls:', error);
        await interaction.reply({
            content: '❌ Failed to retrieve polls.',
            ephemeral: true
        });
    }
}

async function handleEndNominations(interaction) {
    let pollId = interaction.options.getString('poll_id');
    
    try {
        // Auto-detect poll if not provided
        if (!pollId) {
            const activePolls = await getActivePolls();
            const guildNominationPolls = activePolls.filter(poll => 
                poll.guildId === interaction.guildId && poll.phase === 'nomination'
            );
            
            if (guildNominationPolls.length === 0) {
                return await interaction.reply({
                    content: 'No active nomination polls found in this server.',
                    ephemeral: true
                });
            }
            
            if (guildNominationPolls.length > 1) {
                const pollList = guildNominationPolls.map(poll => `\`${poll.id}\` - ${poll.title}`).join('\n');
                return await interaction.reply({
                    content: `Multiple active polls found. Please specify which poll:\n${pollList}`,
                    ephemeral: true
                });
            }
            
            pollId = guildNominationPolls[0].id;
        }
        
        const poll = await getPoll(pollId);
        if (!poll) {
            return await interaction.reply({
                content: 'Poll not found!',
                ephemeral: true
            });
        }
        
        // Check if user is the poll creator
        if (poll.createdBy !== interaction.user.id) {
            return await interaction.reply({
                content: 'Only the poll creator can end the nomination period early.',
                ephemeral: true
            });
        }
        
        if (poll.phase !== 'nomination') {
            return await interaction.reply({
                content: `This poll is already in the ${poll.phase} phase.`,
                ephemeral: true
            });
        }
        
        if (poll.nominations.length === 0) {
            return await interaction.reply({
                content: 'Cannot end nominations - no books have been nominated yet!',
                ephemeral: true
            });
        }
        
        await updatePollPhase(pollId, 'voting');
        
        // Send voting phase announcement to the channel
        const { announceVotingPhase } = require('../services/scheduler');
        await announceVotingPhase(poll);
        
        const embed = new EmbedBuilder()
            .setTitle('📝➡️🗳️ Nomination Period Ended')
            .setDescription(`**${poll.title}** has moved to the voting phase!`)
            .addFields(
                { name: '📚 Books Nominated', value: poll.nominations.length.toString(), inline: true },
                { name: '🗳️ Voting Ends', value: `<t:${Math.floor(poll.votingEnd.getTime() / 1000)}:F>`, inline: true }
            )
            .setColor('#FFA500')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error ending nominations:', error);
        await interaction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleEndVoting(interaction) {
    let pollId = interaction.options.getString('poll_id');
    
    try {
        // Auto-detect poll if not provided
        if (!pollId) {
            const activePolls = await getActivePolls();
            const guildVotingPolls = activePolls.filter(poll => 
                poll.guildId === interaction.guildId && poll.phase === 'voting'
            );
            
            if (guildVotingPolls.length === 0) {
                return await interaction.reply({
                    content: 'No active voting polls found in this server.',
                    ephemeral: true
                });
            }
            
            if (guildVotingPolls.length > 1) {
                const pollList = guildVotingPolls.map(poll => `\`${poll.id}\` - ${poll.title}`).join('\n');
                return await interaction.reply({
                    content: `Multiple active polls found. Please specify which poll:\n${pollList}`,
                    ephemeral: true
                });
            }
            
            pollId = guildVotingPolls[0].id;
        }
        
        const poll = await getPoll(pollId);
        if (!poll) {
            return await interaction.reply({
                content: 'Poll not found!',
                ephemeral: true
            });
        }
        
        // Check if user is the poll creator
        if (poll.createdBy !== interaction.user.id) {
            return await interaction.reply({
                content: 'Only the poll creator can end the voting period early.',
                ephemeral: true
            });
        }
        
        if (poll.phase !== 'voting') {
            return await interaction.reply({
                content: `This poll is not in the voting phase (currently: ${poll.phase}).`,
                ephemeral: true
            });
        }
        
        if (poll.votes.length === 0) {
            return await interaction.reply({
                content: 'Cannot end voting - no votes have been submitted yet!',
                ephemeral: true
            });
        }
        
        const results = await completePoll(pollId);
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 Poll Results')
            .setDescription(`**${poll.title}** voting has ended!`)
            .setColor('#00FF00')
            .setTimestamp();
        
        if (results && results.winner) {
            embed.addFields({
                name: '🥇 Winner',
                value: `**${results.winner.title}**\n[Link](${results.winner.link})`,
                inline: false
            });
            
            embed.addFields({
                name: '📊 Voting Method',
                value: results.method,
                inline: true
            });
            
            embed.addFields({
                name: '🗳️ Total Votes',
                value: results.totalVotes.toString(),
                inline: true
            });
            
            // Add round details if available
            if (results.rounds && results.rounds.length > 1) {
                const roundSummary = results.rounds.map((round, index) => {
                    const topCandidate = round.results[0];
                    return `Round ${round.round}: ${topCandidate.candidate.title} (${topCandidate.votes} votes)`;
                }).join('\n');
                
                embed.addFields({
                    name: '📈 Voting Rounds',
                    value: roundSummary,
                    inline: false
                });
            }
        } else {
            embed.addFields({
                name: '❌ No Winner',
                value: 'Unable to determine a winner.',
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error ending voting:', error);
        await interaction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleRemoveNomination(interaction) {
    let pollId = interaction.options.getString('poll_id');
    const nominationNumber = interaction.options.getInteger('nomination_number');
    
    try {
        // Auto-detect poll if not provided
        if (!pollId) {
            const activePolls = await getActivePolls();
            const guildActivePolls = activePolls.filter(poll => 
                poll.guildId === interaction.guildId && (poll.phase === 'nomination' || poll.phase === 'voting')
            );
            
            if (guildActivePolls.length === 0) {
                return await interaction.reply({
                    content: 'No active polls found in this server.',
                    ephemeral: true
                });
            }
            
            if (guildActivePolls.length > 1) {
                const pollList = guildActivePolls.map(poll => `\`${poll.id}\` - ${poll.title}`).join('\n');
                return await interaction.reply({
                    content: `Multiple active polls found. Please specify which poll:\n${pollList}`,
                    ephemeral: true
                });
            }
            
            pollId = guildActivePolls[0].id;
        }
        
        const poll = await getPoll(pollId);
        if (!poll) {
            return await interaction.reply({
                content: 'Poll not found!',
                ephemeral: true
            });
        }
        
        // Check if user is the poll creator
        if (poll.createdBy !== interaction.user.id) {
            return await interaction.reply({
                content: 'Only the poll creator can remove nominations.',
                ephemeral: true
            });
        }
        
        if (poll.phase === 'completed') {
            return await interaction.reply({
                content: 'Cannot remove nominations from a completed poll.',
                ephemeral: true
            });
        }
        
        if (nominationNumber < 1 || nominationNumber > poll.nominations.length) {
            return await interaction.reply({
                content: `Invalid nomination number. Please choose between 1 and ${poll.nominations.length}.`,
                ephemeral: true
            });
        }
        
        const nominationToRemove = poll.nominations[nominationNumber - 1];
        await removeNomination(pollId, nominationNumber - 1);
        
        const embed = new EmbedBuilder()
            .setTitle('❌ Nomination Removed')
            .setDescription(`**${nominationToRemove.title}** has been removed from poll \`${pollId}\``)
            .setColor('#FF0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error removing nomination:', error);
        await interaction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleWithdrawNomination(interaction) {
    let pollId = interaction.options.getString('poll_id');
    
    try {
        // Auto-detect poll if not provided
        if (!pollId) {
            const activePolls = await getActivePolls();
            const guildActivePolls = activePolls.filter(poll => 
                poll.guildId === interaction.guildId && poll.phase === 'nomination'
            );
            
            if (guildActivePolls.length === 0) {
                return await interaction.reply({
                    content: 'No active nomination polls found in this server.',
                    ephemeral: true
                });
            }
            
            if (guildActivePolls.length > 1) {
                const pollList = guildActivePolls.map(poll => `\`${poll.id}\` - ${poll.title}`).join('\n');
                return await interaction.reply({
                    content: `Multiple active polls found. Please specify which poll:\n${pollList}`,
                    ephemeral: true
                });
            }
            
            pollId = guildActivePolls[0].id;
        }
        
        const poll = await getPoll(pollId);
        if (!poll) {
            return await interaction.reply({
                content: 'Poll not found!',
                ephemeral: true
            });
        }
        
        if (poll.phase !== 'nomination') {
            return await interaction.reply({
                content: 'You can only withdraw nominations during the nomination phase.',
                ephemeral: true
            });
        }
        
        const removedNomination = await pollManager.removeUserNomination(pollId, interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Nomination Withdrawn')
            .setDescription(`Your nomination **${removedNomination.title}** has been withdrawn from poll \`${pollId}\``)
            .addFields({ name: 'Poll', value: poll.title })
            .setColor('#FF9900')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
    } catch (error) {
        console.error('Error withdrawing nomination:', error);
        await interaction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true
        });
    }
}
