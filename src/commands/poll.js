// Serverless Poll Command for Cloudflare Workers
import { InteractionResponseType } from 'discord-interactions';
import { PollManager } from '../services/pollManager.js';

export const pollCommand = {
    data: {
        name: 'poll',
        description: 'Manage book polls',
        options: [
            {
                name: 'create',
                description: 'Create a new book poll',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'title',
                        description: 'Poll title',
                        type: 3, // STRING
                        required: true
                    },
                    {
                        name: 'nomination_hours',
                        description: 'Hours for nomination phase',
                        type: 4, // INTEGER
                        required: true
                    },
                    {
                        name: 'voting_hours',
                        description: 'Hours for voting phase',
                        type: 4, // INTEGER
                        required: true
                    },
                    {
                        name: 'tally_method',
                        description: 'Voting method',
                        type: 3, // STRING
                        required: false,
                        choices: [
                            { name: 'Ranked Choice (rank all books)', value: 'ranked-choice' },
                            { name: 'Chris Style (top 3 picks)', value: 'chris-style' }
                        ]
                    }
                ]
            },
            {
                name: 'status',
                description: 'Check poll status',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'poll_id',
                        description: 'Poll ID (optional - will auto-detect if not provided)',
                        type: 3, // STRING
                        required: false
                    }
                ]
            },
            {
                name: 'nominate',
                description: 'Nominate a book',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'title',
                        description: 'Book title',
                        type: 3, // STRING
                        required: true
                    },
                    {
                        name: 'author',
                        description: 'Book author',
                        type: 3, // STRING
                        required: false
                    },
                    {
                        name: 'link',
                        description: 'Link to book info',
                        type: 3, // STRING
                        required: false
                    },
                    {
                        name: 'poll_id',
                        description: 'Poll ID (optional - will auto-detect if not provided)',
                        type: 3, // STRING
                        required: false
                    }
                ]
            },
            {
                name: 'list',
                description: 'List all polls in this server',
                type: 1 // SUB_COMMAND
            },
            {
                name: 'end-nominations',
                description: 'End nomination phase early',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'poll_id',
                        description: 'Poll ID (optional - will auto-detect if not provided)',
                        type: 3, // STRING
                        required: false
                    }
                ]
            },
            {
                name: 'end-voting',
                description: 'End voting phase early',
                type: 1, // SUB_COMMAND
                options: [
                    {
                        name: 'poll_id',
                        description: 'Poll ID (optional - will auto-detect if not provided)',
                        type: 3, // STRING
                        required: false
                    }
                ]
            }
        ]
    },

    async execute(interaction, env) {
        const subcommand = interaction.data.options[0].name;
        const options = interaction.data.options[0].options || [];
        
        try {
            const pollManager = new PollManager(env);
            
            switch (subcommand) {
                case 'create':
                    return await this.handleCreate(interaction, options, pollManager);
                case 'status':
                    return await this.handleStatus(interaction, options, pollManager);
                case 'nominate':
                    return await this.handleNominate(interaction, options, pollManager);
                case 'list':
                    return await this.handleList(interaction, pollManager);
                case 'end-nominations':
                    return await this.handleEndNominations(interaction, options, pollManager);
                case 'end-voting':
                    return await this.handleEndVoting(interaction, options, pollManager);
                default:
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Unknown subcommand',
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
            }
        } catch (error) {
            console.error('Error executing poll command:', error);
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
    },

    async handleCreate(interaction, options, pollManager) {
        const title = options.find(opt => opt.name === 'title').value;
        const nominationHours = options.find(opt => opt.name === 'nomination_hours').value;
        const votingHours = options.find(opt => opt.name === 'voting_hours').value;
        const tallyMethod = options.find(opt => opt.name === 'tally_method')?.value || 'ranked-choice';

        const now = new Date();
        const nominationDeadline = new Date(now.getTime() + nominationHours * 60 * 60 * 1000);
        const votingDeadline = new Date(nominationDeadline.getTime() + votingHours * 60 * 60 * 1000);

        const pollData = {
            title,
            guildId: interaction.guild_id,
            channelId: interaction.channel_id,
            creatorId: interaction.member.user.id,
            nominationDeadline: nominationDeadline.toISOString(),
            votingDeadline: votingDeadline.toISOString(),
            tallyMethod
        };

        const poll = await pollManager.createPoll(pollData);

        const embed = {
            title: '📚 New Book Poll Created!',
            description: `**${poll.title}**`,
            color: 0x0099FF,
            fields: [
                {
                    name: '📝 Current Phase',
                    value: 'Nomination',
                    inline: true
                },
                {
                    name: '🗳️ Voting Method',
                    value: tallyMethod === 'chris-style' ? 'Chris Style (Top 3 picks)' : 'Ranked Choice',
                    inline: true
                },
                {
                    name: '⏰ Nomination Deadline',
                    value: `<t:${Math.floor(nominationDeadline.getTime() / 1000)}:F>`,
                    inline: false
                },
                {
                    name: '⏰ Voting Deadline',
                    value: `<t:${Math.floor(votingDeadline.getTime() / 1000)}:F>`,
                    inline: false
                },
                {
                    name: '🆔 Poll ID',
                    value: `\`${poll.id}\``,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                embeds: [embed]
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    async handleStatus(interaction, options, pollManager) {
        let pollId = options.find(opt => opt.name === 'poll_id')?.value;
        
        // Auto-detect poll if not provided
        if (!pollId) {
            const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
            if (!activePoll) {
                const allPolls = await pollManager.getAllPolls(interaction.guild_id);
                if (allPolls.length === 0) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: '📚 No polls found in this server.',
                            flags: 64 // Ephemeral
                        }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // Sort polls by creation timestamp (newest first)
                const sortedPolls = allPolls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const pollList = sortedPolls.map(poll => 
                    `\`${poll.id}\` - ${poll.title} - <t:${Math.floor(new Date(poll.createdAt).getTime() / 1000)}:R>`
                ).join('\n');
                
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `Multiple polls found. Please specify which poll:\n${pollList}`,
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            pollId = activePoll.id;
        }
        
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

        const embed = await this.createStatusEmbed(poll);
        const components = poll.phase === 'voting' ? [{
            type: 1, // Action Row
            components: [{
                type: 2, // Button
                style: 1, // Primary
                label: '🗳️ Vote',
                custom_id: `vote_${poll.id}`
            }]
        }] : [];

        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                embeds: [embed],
                components: components
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    async createStatusEmbed(poll) {
        const embed = {
            title: `📊 Poll Status: ${poll.title}`,
            color: poll.phase === 'completed' ? 0xFFD700 : poll.phase === 'voting' ? 0x00FF00 : 0x0099FF,
            fields: [
                {
                    name: '📝 Phase',
                    value: poll.phase.charAt(0).toUpperCase() + poll.phase.slice(1),
                    inline: true
                },
                {
                    name: '🗳️ Method',
                    value: poll.tallyMethod === 'chris-style' ? 'Chris Style' : 'Ranked Choice',
                    inline: true
                },
                {
                    name: '📚 Nominations',
                    value: poll.nominations.length.toString(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        if (poll.nominations.length > 0) {
            embed.fields.push({
                name: '📖 Nominated Books',
                value: poll.nominations.map((book, index) => 
                    `${index + 1}. **${book.title}**${book.author ? ` by ${book.author}` : ''}`
                ).join('\n'),
                inline: false
            });
        }

        if (poll.phase === 'nomination') {
            embed.fields.push({
                name: '⏰ Nomination Deadline',
                value: `<t:${Math.floor(new Date(poll.nominationDeadline).getTime() / 1000)}:F>`,
                inline: false
            });
        } else if (poll.phase === 'voting') {
            embed.fields.push(
                {
                    name: '🗳️ Votes Cast',
                    value: `${poll.votes.length} votes`,
                    inline: true
                },
                {
                    name: '⏰ Voting Deadline',
                    value: `<t:${Math.floor(new Date(poll.votingDeadline).getTime() / 1000)}:F>`,
                    inline: false
                }
            );
        } else if (poll.phase === 'completed' && poll.results) {
            if (poll.tallyMethod === 'chris-style') {
                embed.fields.push({
                    name: '🏆 Chris Style Results',
                    value: poll.results.standings.map((result, index) => {
                        const position = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                        return `${position} **${result.nomination.title}** - ${result.points} points`;
                    }).join('\n'),
                    inline: false
                });
            } else {
                embed.fields.push({
                    name: '🏆 Ranked Choice Results',
                    value: poll.results.standings.map((result, index) => {
                        const position = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                        const percentage = poll.results.totalVotes > 0 ? Math.round((result.votes / poll.results.totalVotes) * 100) : 0;
                        return `${position} **${result.nomination.title}** - ${result.votes} votes (${percentage}%)`;
                    }).join('\n'),
                    inline: false
                });
            }
        }

        return embed;
    },

    async handleNominate(interaction, options, pollManager) {
        const title = options.find(opt => opt.name === 'title').value;
        const author = options.find(opt => opt.name === 'author')?.value || '';
        const link = options.find(opt => opt.name === 'link')?.value || '';
        let pollId = options.find(opt => opt.name === 'poll_id')?.value;

        // Auto-detect poll if not provided
        if (!pollId) {
            const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
            if (!activePoll) {
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'No active poll found. Please specify a poll ID or create a new poll.',
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            pollId = activePoll.id;
        }

        const nomination = {
            title,
            author,
            link,
            userId: interaction.member.user.id,
            username: interaction.member.user.username,
            timestamp: new Date().toISOString()
        };

        const poll = await pollManager.nominateBook(pollId, nomination);

        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `✅ **${title}** has been nominated for the poll "${poll.title}"!`,
                flags: 64 // Ephemeral
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    async handleList(interaction, pollManager) {
        const polls = await pollManager.getAllPolls(interaction.guild_id);
        
        if (polls.length === 0) {
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '📚 No polls found in this server.',
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Sort polls by creation timestamp (newest first)
        const sortedPolls = polls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const embed = {
            title: '📚 Book Polls',
            color: 0x0099FF,
            fields: [],
            timestamp: new Date().toISOString()
        };
        
        sortedPolls.forEach(poll => {
            const status = poll.phase === 'completed' ? '✅' : 
                          poll.phase === 'voting' ? '🗳️' : '📝';
            
            const tallyMethodDisplay = poll.tallyMethod === 'chris-style' ? 'Chris Style' : 'Ranked Choice';
            
            embed.fields.push({
                name: `${status} ${poll.title}`,
                value: `ID: \`${poll.id}\` | Phase: ${poll.phase} | Method: ${tallyMethodDisplay}\nNominations: ${poll.nominations.length} | Created: <t:${Math.floor(new Date(poll.createdAt).getTime() / 1000)}:R>`,
                inline: false
            });
        });
        
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                embeds: [embed]
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    async handleEndNominations(interaction, options, pollManager) {
        let pollId = options.find(opt => opt.name === 'poll_id')?.value;
        
        // Auto-detect poll if not provided
        if (!pollId) {
            const activePolls = await pollManager.getActivePolls();
            const guildNominationPolls = activePolls.filter(poll => 
                poll.guildId === interaction.guild_id && poll.phase === 'nomination'
            );
            
            if (guildNominationPolls.length === 0) {
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'No active nomination polls found in this server.',
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            if (guildNominationPolls.length > 1) {
                const sortedPolls = guildNominationPolls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const pollList = sortedPolls.map(poll => 
                    `\`${poll.id}\` - ${poll.title} - <t:${Math.floor(new Date(poll.createdAt).getTime() / 1000)}:R>`
                ).join('\n');
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `Multiple active polls found. Please specify which poll:\n${pollList}`,
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            pollId = guildNominationPolls[0].id;
        }
        
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
        
        if (poll.phase !== 'nomination') {
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'This poll is not in the nomination phase!',
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (poll.creatorId !== interaction.member.user.id) {
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Only the poll creator can end the nomination phase early!',
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await pollManager.updatePollPhase(pollId, 'voting');
        
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `✅ Nomination phase ended for poll "${poll.title}". Voting phase has begun!`
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    async handleEndVoting(interaction, options, pollManager) {
        let pollId = options.find(opt => opt.name === 'poll_id')?.value;
        
        // Auto-detect poll if not provided
        if (!pollId) {
            const activePolls = await pollManager.getActivePolls();
            const guildVotingPolls = activePolls.filter(poll => 
                poll.guildId === interaction.guild_id && poll.phase === 'voting'
            );
            
            if (guildVotingPolls.length === 0) {
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'No active voting polls found in this server.',
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            if (guildVotingPolls.length > 1) {
                const sortedPolls = guildVotingPolls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const pollList = sortedPolls.map(poll => 
                    `\`${poll.id}\` - ${poll.title} - <t:${Math.floor(new Date(poll.createdAt).getTime() / 1000)}:R>`
                ).join('\n');
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `Multiple active polls found. Please specify which poll:\n${pollList}`,
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            pollId = guildVotingPolls[0].id;
        }
        
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
                    content: 'This poll is not in the voting phase!',
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (poll.creatorId !== interaction.member.user.id) {
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Only the poll creator can end the voting phase early!',
                    flags: 64 // Ephemeral
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await pollManager.updatePollPhase(pollId, 'completed');
        const completedPoll = await pollManager.getPoll(pollId);
        
        const embed = {
            title: '🏆 Poll Completed',
            description: `Poll: **${completedPoll.title}**`,
            color: 0xFFD700,
            fields: [
                {
                    name: '🥇 Winner',
                    value: completedPoll.results.winner ? 
                        `**${completedPoll.results.winner.title}**\n${completedPoll.results.winner.link ? `[Link](${completedPoll.results.winner.link})` : ''}` : 
                        'No clear winner'
                }
            ],
            timestamp: new Date().toISOString()
        };
        
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                embeds: [embed]
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
};