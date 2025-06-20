// Serverless interaction handlers for Cloudflare Workers
import { InteractionResponseType } from 'discord-interactions';
import { PollManager } from '../services/pollManager.js';

// Poll command handlers
export async function handleCreatePoll(interaction, options, pollManager) {
  const title = getOptionValue(options, 'title');
  const nominationEnd = getOptionValue(options, 'nomination_end');
  const votingEnd = getOptionValue(options, 'voting_end');
  const tallyMethod = getOptionValue(options, 'tally_method') || 'ranked-choice';

  if (!title || !nominationEnd || !votingEnd) {
    return createResponse('Title, nomination deadline, and voting deadline are required.');
  }

  const pollData = {
    title,
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    creatorId: interaction.member?.user?.id || interaction.user?.id,
    nominationDeadline: nominationEnd,
    votingDeadline: votingEnd,
    tallyMethod,
    phase: 'nomination'
  };

  try {
    const poll = await pollManager.createPoll(pollData);
    
    const embed = {
      title: '📚 New Book Poll Created!',
      description: `**${title}**\n\nNomination phase has started!`,
      color: 0x00FF00,
      fields: [
        {
          name: '📝 Nomination Deadline',
          value: `<t:${Math.floor(new Date(nominationEnd).getTime() / 1000)}:F>`,
          inline: true
        },
        {
          name: '🗳️ Voting Deadline',
          value: `<t:${Math.floor(new Date(votingEnd).getTime() / 1000)}:F>`,
          inline: true
        },
        {
          name: '📊 Tally Method',
          value: tallyMethod === 'chris-style' ? 'Chris Style (Top 3 Points)' : 'Ranked Choice (IRV)',
          inline: true
        }
      ],
      footer: { text: `Poll ID: ${poll.id}` }
    };

    return {
      type: 4,
      data: { embeds: [embed] }
    };
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handlePollStatus(interaction, options, pollManager) {
  let pollId = getOptionValue(options, 'poll_id');

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll) {
      return createResponse('No active poll found. Please specify a poll ID.');
    }
    pollId = activePoll.id;
  }

  try {
    const poll = await pollManager.getPoll(pollId);
    if (!poll) {
      return createResponse('Poll not found.');
    }



    const embed = {
      title: `📚 ${poll.title}`,
      description: poll.creatorId ? `Created by <@${poll.creatorId}>` : null,
      color: poll.phase === 'nomination' ? 0x0099FF : poll.phase === 'voting' ? 0xFF9900 : 0x808080,
      fields: [
        {
          name: '📝 Phase',
          value: poll.phase.charAt(0).toUpperCase() + poll.phase.slice(1),
          inline: true
        },
        {
          name: '📊 Tally Method',
          value: poll.tallyMethod === 'chris-style' ? 'Chris Style' : 'Ranked Choice',
          inline: true
        },
        {
          name: '📚 Nominations',
          value: poll.nominations?.length?.toString() || '0',
          inline: true
        }
      ],
      footer: { text: `Poll ID: ${poll.id}` },
      timestamp: new Date().toISOString()
    };



    if (poll.nominations && poll.nominations.length > 0) {
      const nominationsList = poll.nominations.map((nom, idx) => 
        `${idx + 1}. **${nom.title}** ${nom.author ? `by ${nom.author}` : ''} (${nom.username})`
      ).join('\n');
      
      embed.fields.push({
        name: '📖 Nominated Books',
        value: nominationsList,
        inline: false
      });
    }

    console.log('Final embed structure:', JSON.stringify(embed, null, 2));

    return {
      type: 4,
      data: { embeds: [embed] }
    };
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handleNominate(interaction, options, pollManager) {
  const title = getOptionValue(options, 'title');
  const author = getOptionValue(options, 'author');
  const link = getOptionValue(options, 'link');
  let pollId = getOptionValue(options, 'poll_id');

  if (!title) {
    return createResponse('Book title is required for nomination.');
  }

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll || activePoll.phase !== 'nomination') {
      return createResponse('No active nomination phase found. Please specify a poll ID.');
    }
    pollId = activePoll.id;
  }

  const nomination = {
    title,
    author,
    link,
    userId: interaction.member?.user?.id || interaction.user?.id,
    username: interaction.member?.user?.username || interaction.user?.username
  };

  try {
    await pollManager.nominateBook(pollId, nomination);
  } catch (error) {
    console.error('Nomination error:', error);
    
    // Check if user already has a nomination
    if (error.message.includes('already nominated')) {
      return createResponse(`${error.message}. Use /poll withdraw-nomination if you want to change your nomination.`);
    }
    
    return createResponse(`❌ ${error.message}`);
  }

  // Announce nomination to channel (optional, don't fail if it doesn't work)
  try {
    const poll = await pollManager.getPoll(pollId);
    const channelId = poll.channelId || interaction.channel_id;
    
    if (channelId) {
      const linkText = link ? ` [🔗 Link](${link})` : '';
      const announcementContent = `📚 **New Book Nomination!**\n\n**${title}**${author ? ` by ${author}` : ''}${linkText}\n\nNominated by <@${nomination.userId}> for **${poll.title}**`;
      
      console.log('Sending nomination announcement to channel:', channelId);
      const result = await sendDiscordMessage(channelId, announcementContent, pollManager.env);
      
      if (result) {
        console.log('Nomination announcement sent successfully');
      } else {
        console.log('Nomination announcement skipped due to rate limiting');
      }
    }
  } catch (error) {
    console.warn('Failed to announce nomination (non-critical):', error.message);
    // Don't fail the nomination if announcement fails
  }

  return createResponse(`✅ Successfully nominated "${title}" ${author ? `by ${author}` : ''}!`);
}

export async function handleListPolls(interaction, pollManager) {
  const activePolls = await pollManager.getAllPolls(interaction.guild_id);
  
  if (activePolls.length === 0) {
    return createResponse('📚 No active polls found in this server.');
  }

  const pollsList = activePolls.map(poll => {
    const status = poll.phase === 'nomination' ? '📝 Nominating' : 
                  poll.phase === 'voting' ? '🗳️ Voting' : '✅ Completed';
    const nominations = poll.nominations?.length || 0;
    return `**${poll.title}** (${poll.id})\n${status} • ${nominations} nominations • ${poll.tallyMethod}`;
  }).join('\n\n');

  return {
    type: 4,
    data: {
      embeds: [{
        title: '📚 Book Club Polls',
        description: pollsList,
        color: 0x0099FF,
        timestamp: new Date().toISOString()
      }]
    }
  };
}

export async function handleWithdrawNomination(interaction, options, pollManager) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  let pollId = getOptionValue(options, 'poll_id');
  const env = pollManager.env;

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll || activePoll.phase !== 'nomination') {
      return createResponse('No active nomination phase found.');
    }
    pollId = activePoll.id;
  }

  try {
    // Get nomination details before removal for announcement
    const poll = await pollManager.getPoll(pollId);
    const userNomination = poll.nominations?.find(nom => nom.userId === userId);
    
    await pollManager.removeUserNomination(pollId, userId);
    
    // Announce withdrawal to channel (optional, don't fail if it doesn't work)
    if (userNomination && poll.channelId) {
      try {
        const linkText = userNomination.link ? ` [🔗 Link](${userNomination.link})` : '';
        const announcementContent = `📖 **Nomination Withdrawn**\n\n**${userNomination.title}**${userNomination.author ? ` by ${userNomination.author}` : ''}${linkText}\n\nWithdrawn by <@${userId}> from **${poll.title}**`;
        
        console.log('Sending withdrawal announcement to channel:', poll.channelId);
        const result = await sendDiscordMessage(poll.channelId, announcementContent, pollManager.env);
        
        if (result) {
          console.log('Withdrawal announcement sent successfully');
        } else {
          console.log('Withdrawal announcement skipped due to rate limiting');
        }
      } catch (error) {
        console.warn('Failed to announce withdrawal (non-critical):', error.message);
      }
    }
    
    return createResponse('✅ Your nomination has been withdrawn.');
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handleVote(interaction, options, pollManager) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  let pollId = getOptionValue(options, 'poll_id');

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll || activePoll.phase !== 'voting') {
      return createResponse('No active voting phase found.');
    }
    pollId = activePoll.id;
  }

  try {
    const poll = await pollManager.getPoll(pollId);
    if (!poll || poll.phase !== 'voting') {
      return createResponse('This poll is not in voting phase.');
    }

    if (!poll.nominations || poll.nominations.length === 0) {
      return createResponse('No nominations available for voting.');
    }

    // Generate voting interface based on tally method
    if (poll.tallyMethod === 'chris-style') {
      return await generateChrisStyleVotingInterface(poll, userId, []);
    } else {
      return await generateRankedChoiceVotingInterface(poll);
    }
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handleRemoveNomination(interaction, options, pollManager) {
  const nominationId = getOptionValue(options, 'nomination_id');
  let pollId = getOptionValue(options, 'poll_id');
  const userId = interaction.member?.user?.id || interaction.user?.id;

  if (!nominationId) {
    return createResponse('Nomination ID is required.');
  }

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll) {
      return createResponse('No active poll found.');
    }
    pollId = activePoll.id;
  }

  try {
    const poll = await pollManager.getPoll(pollId);
    if (!poll) {
      return createResponse('Poll not found.');
    }

    if (poll.creatorId !== userId) {
      return createResponse('Only the poll creator can remove nominations.');
    }

    const nominationIndex = parseInt(nominationId) - 1;
    if (isNaN(nominationIndex) || nominationIndex < 0 || !poll.nominations || nominationIndex >= poll.nominations.length) {
      return createResponse('Invalid nomination ID.');
    }

    const nomination = poll.nominations[nominationIndex];
    poll.nominations.splice(nominationIndex, 1);
    
    await pollManager.updatePoll(pollId, { nominations: poll.nominations });
    
    return createResponse(`✅ Removed nomination: "${nomination.title}" ${nomination.author ? `by ${nomination.author}` : ''}`);
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handleEndNominations(interaction, options, pollManager) {
  let pollId = getOptionValue(options, 'poll_id');
  const userId = interaction.member?.user?.id || interaction.user?.id;

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll) {
      return createResponse('No active poll found.');
    }
    pollId = activePoll.id;
  }

  try {
    const poll = await pollManager.getPoll(pollId);
    if (!poll) {
      return createResponse('Poll not found.');
    }

    if (poll.creatorId !== userId) {
      return createResponse('Only the poll creator can end nomination phase.');
    }

    if (poll.phase !== 'nomination') {
      return createResponse('This poll is not in nomination phase.');
    }

    await pollManager.updatePollPhase(pollId, 'voting');
    
    return createResponse('✅ Nomination phase ended. Voting phase has begun!');
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handleEndVoting(interaction, options, pollManager) {
  let pollId = getOptionValue(options, 'poll_id');
  const userId = interaction.member?.user?.id || interaction.user?.id;

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll) {
      return createResponse('No active poll found.');
    }
    pollId = activePoll.id;
  }

  try {
    const poll = await pollManager.getPoll(pollId);
    if (!poll) {
      return createResponse('Poll not found.');
    }

    if (poll.creatorId !== userId) {
      return createResponse('Only the poll creator can end voting phase.');
    }

    if (poll.phase !== 'voting') {
      return createResponse('This poll is not in voting phase.');
    }

    const results = pollManager.calculateResults(poll);
    await pollManager.updatePoll(pollId, { 
      phase: 'completed',
      results: results
    });

    return {
      type: 4,
      data: {
        embeds: [{
          title: `🏆 Poll Results: ${poll.title}`,
          description: results.summary,
          color: 0x00FF00,
          footer: { text: `Poll ID: ${poll.id}` }
        }]
      }
    };
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

// Discord message sending helper
async function sendDiscordMessage(channelId, content, env) {
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  
  try {
    // Add small delay to help with rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord API error:', response.status, errorText);
      
      // Handle rate limiting gracefully
      if (response.status === 429) {
        console.warn('Discord API rate limit hit, skipping announcement');
        return null; // Don't throw error for rate limits
      }
      
      throw new Error(`Discord API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to send Discord message:', error);
    
    // Don't throw error for rate limiting issues
    if (error.message.includes('429')) {
      console.warn('Rate limit detected, skipping announcement');
      return null;
    }
    
    throw error;
  }
}

// Helper functions
function getOptionValue(options, name) {
  return options?.find(option => option.name === name)?.value;
}

function createResponse(content, ephemeral = true) {
  return {
    type: 4,
    data: {
      content,
      flags: ephemeral ? 64 : 0
    }
  };
}

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
            } else if (customId.startsWith('ranked_choice_')) {
                return await handleRankedChoiceVoting(interaction, env, pollManager);
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

async function handleRankedChoiceVoting(interaction, env, pollManager) {
    const customId = interaction.data.custom_id;
    const pollId = customId.split('_')[2];
    const rank = parseInt(customId.split('_')[4]);
    const userId = interaction.member?.user?.id || interaction.user?.id;
    const selectedValue = interaction.data.values[0];

    try {
        // Get or create voting session
        const userKey = `ranked_${pollId}_${userId}`;
        let session = await pollManager.getVotingSession(userKey);
        
        if (!session) {
            session = { pollId, userId, selections: {} };
        }

        // Update selection for this rank
        if (selectedValue === 'none') {
            delete session.selections[rank];
        } else {
            const bookIndex = parseInt(selectedValue.split('_')[1]);
            session.selections[rank] = bookIndex;
        }

        // Save updated session
        await pollManager.setVotingSession(userKey, pollId, userId, session.selections);

        // Show current selections
        const poll = await pollManager.getPoll(pollId);
        const nominations = poll.nominations || [];
        
        const currentSelections = Object.entries(session.selections)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([rank, bookIdx]) => {
                const book = nominations[bookIdx];
                return `${rank}. ${book?.title || 'Unknown'} by ${book?.author || 'Unknown Author'}`;
            });

        const selectionsDisplay = currentSelections.length > 0 
            ? `**Current Rankings:**\n${currentSelections.join('\n')}`
            : 'No rankings selected yet.';

        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `✅ Ranking updated!\n\n${selectionsDisplay}\n\nContinue selecting your rankings, then click Submit when ready.`,
                flags: 64
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `❌ ${error.message}`,
                flags: 64
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleRankedChoiceSubmission(interaction, env, pollManager) {
    const pollId = interaction.data.custom_id.split('_')[3];
    const userId = interaction.member?.user?.id || interaction.user?.id;

    try {
        // Get voting session
        const userKey = `ranked_${pollId}_${userId}`;
        const session = await pollManager.getVotingSession(userKey);
        
        if (!session || Object.keys(session.selections).length === 0) {
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '❌ Please make at least one ranking selection before submitting.',
                    flags: 64
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get poll data
        const poll = await pollManager.getPoll(pollId);
        if (!poll || poll.phase !== 'voting') {
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '❌ This poll is not in voting phase.',
                    flags: 64
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Convert selections to rankings format
        const nominations = poll.nominations || [];
        const rankings = Object.entries(session.selections)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([rank, bookIdx]) => {
                const book = nominations[bookIdx];
                return {
                    nominationId: book?.id || book?.title,
                    title: book?.title,
                    author: book?.author
                };
            });

        if (rankings.length === 0) {
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '❌ No valid rankings found. Please make your selections.',
                    flags: 64
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Submit vote
        await pollManager.submitVote(pollId, userId, rankings);
        
        // Clean up session
        await pollManager.deleteVotingSession(userKey);

        const rankingsDisplay = rankings.map((book, idx) => 
            `${idx + 1}. ${book.title} by ${book.author || 'Unknown Author'}`
        ).join('\n');

        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `✅ Your ranked vote has been submitted!\n\n**Your Rankings:**\n${rankingsDisplay}`,
                flags: 64
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `❌ ${error.message}`,
                flags: 64
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export function generateChrisStyleVotingInterface(poll, userId, existingSelections = []) {
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

export function generateRankedChoiceVotingInterface(poll) {
    const nominations = poll.nominations || [];
    
    if (nominations.length === 0) {
        return new Response(JSON.stringify({
            type: 4,
            data: {
                content: '❌ No nominations available for voting.',
                flags: 64
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Create dropdown options for each book
    const bookOptions = nominations.map((nom, idx) => ({
        label: `${nom.title} by ${nom.author || 'Unknown Author'}`,
        value: `book_${idx}`,
        description: nom.title.length > 50 ? nom.title.substring(0, 47) + '...' : nom.title
    }));

    // Create multiple select components for ranking (up to 5 choices)
    const components = [];
    const maxRankings = Math.min(nominations.length, 5);

    for (let i = 0; i < maxRankings; i++) {
        const rank = i + 1;
        const isRequired = i === 0; // Only first choice is required
        
        components.push({
            type: 1, // ACTION_ROW
            components: [
                {
                    type: 3, // SELECT_MENU
                    custom_id: `ranked_choice_${poll.id}_rank_${rank}`,
                    placeholder: `${rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : rank + 'th'} Choice${isRequired ? ' (Required)' : ' (Optional)'}`,
                    options: [
                        {
                            label: '-- No Selection --',
                            value: 'none',
                            description: 'Skip this ranking'
                        },
                        ...bookOptions
                    ],
                    min_values: isRequired ? 1 : 0,
                    max_values: 1
                }
            ]
        });
    }

    // Add submit button
    components.push({
        type: 1, // ACTION_ROW
        components: [
            {
                type: 2, // BUTTON
                custom_id: `submit_ranked_vote_${poll.id}`,
                label: 'Submit Ranked Vote',
                style: 3, // SUCCESS
                emoji: { name: '🗳️' }
            }
        ]
    });

    return new Response(JSON.stringify({
        type: 4,
        data: {
            embeds: [{
                title: `🗳️ Ranked Choice Voting: ${poll.title}`,
                description: `Rank the books in order of preference. You must select at least your 1st choice.\n\n**Available Books:**\n${nominations.map((nom, idx) => `${idx + 1}. **${nom.title}** by ${nom.author || 'Unknown Author'}`).join('\n')}`,
                color: 0xFF9900,
                footer: { text: 'Select your rankings below, then click Submit' }
            }],
            components,
            flags: 64
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}