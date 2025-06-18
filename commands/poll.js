const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPoll, nominateBook, submitVote, getPoll, getAllPolls } = require('../services/pollManager');

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
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nominate')
                .setDescription('Nominate a book for the active poll')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID')
                        .setRequired(true))
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
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('vote')
                .setDescription('Vote in a poll (opens voting interface)')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of a poll')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID')
                        .setRequired(true)))
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
        }
    }
};

async function handleCreatePoll(interaction) {
    const title = interaction.options.getString('title');
    const nominationEnd = interaction.options.getString('nomination_end');
    const votingEnd = interaction.options.getString('voting_end');
    const description = interaction.options.getString('description') || '';
    
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
            guildId: interaction.guildId
        });
        
        const embed = new EmbedBuilder()
            .setTitle('📚 New Book Poll Created!')
            .setDescription(`**${title}**\n${description}`)
            .addFields(
                { name: '🆔 Poll ID', value: pollId, inline: true },
                { name: '📝 Nominations Close', value: `<t:${Math.floor(nominationEndDate.getTime() / 1000)}:F>`, inline: true },
                { name: '🗳️ Voting Closes', value: `<t:${Math.floor(votingEndDate.getTime() / 1000)}:F>`, inline: true }
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
    const pollId = interaction.options.getString('poll_id');
    const bookTitle = interaction.options.getString('book_title');
    const bookLink = interaction.options.getString('book_link');
    const description = interaction.options.getString('description') || '';
    
    try {
        await nominateBook(pollId, {
            title: bookTitle,
            link: bookLink,
            description,
            nominatedBy: interaction.user.id,
            nominatedAt: new Date()
        });
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Book Nominated!')
            .setDescription(`**${bookTitle}** has been nominated for poll \`${pollId}\``)
            .addFields(
                { name: '🔗 Link', value: bookLink },
                { name: '📝 Description', value: description || 'No description provided' }
            )
            .setColor('#00FF00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error nominating book:', error);
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleVote(interaction) {
    const pollId = interaction.options.getString('poll_id');
    
    try {
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
        
        // Create voting interface
        const embed = new EmbedBuilder()
            .setTitle(`🗳️ Voting: ${poll.title}`)
            .setDescription('Rank the books in order of preference (1 = most preferred)\n\nReply with your rankings like: `1,3,2` where the numbers correspond to the book positions below.')
            .setColor('#0099FF');
        
        // Add nominated books
        poll.nominations.forEach((book, index) => {
            embed.addFields({
                name: `${index + 1}. ${book.title}`,
                value: `[Link](${book.link})\n${book.description || 'No description'}`,
                inline: false
            });
        });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Set up message collector for vote submission
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({
            filter,
            max: 1,
            time: 300000 // 5 minutes
        });
        
        collector.on('collect', async (message) => {
            try {
                const rankings = message.content.split(',').map(r => parseInt(r.trim()));
                
                // Validate rankings
                if (rankings.length !== poll.nominations.length) {
                    return await message.reply('❌ Please rank all books!');
                }
                
                const validNumbers = Array.from({length: poll.nominations.length}, (_, i) => i + 1);
                const sortedRankings = [...rankings].sort();
                
                if (sortedRankings.join(',') !== validNumbers.join(',')) {
                    return await message.reply('❌ Please use each number from 1 to ' + poll.nominations.length + ' exactly once!');
                }
                
                await submitVote(pollId, interaction.user.id, rankings);
                await message.reply('✅ Your vote has been recorded anonymously!');
                
                // Delete the user's ranking message for privacy
                setTimeout(() => {
                    message.delete().catch(() => {});
                }, 5000);
                
            } catch (error) {
                console.error('Error submitting vote:', error);
                await message.reply(`❌ ${error.message}`);
            }
        });
        
        collector.on('end', (collected) => {
            if (collected.size === 0) {
                interaction.followUp({
                    content: '⏰ Voting timeout. Please try again.',
                    ephemeral: true
                });
            }
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
    const pollId = interaction.options.getString('poll_id');
    
    try {
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
            .addFields(
                { name: '📍 Current Phase', value: poll.phase.charAt(0).toUpperCase() + poll.phase.slice(1), inline: true },
                { name: '📝 Nominations', value: poll.nominations.length.toString(), inline: true },
                { name: '🗳️ Votes', value: poll.votes ? poll.votes.length.toString() : '0', inline: true },
                { name: '📅 Nomination End', value: `<t:${Math.floor(poll.nominationEnd.getTime() / 1000)}:F>`, inline: false },
                { name: '📅 Voting End', value: `<t:${Math.floor(poll.votingEnd.getTime() / 1000)}:F>`, inline: false }
            )
            .setColor('#0099FF')
            .setTimestamp();
        
        if (poll.phase === 'completed' && poll.results) {
            embed.addFields({
                name: '🏆 Winner',
                value: poll.results.winner ? `**${poll.results.winner.title}**\n[Link](${poll.results.winner.link})` : 'No winner determined',
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error getting poll status:', error);
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
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
