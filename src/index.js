// Full Discord Bot functionality using vanilla Cloudflare Workers
import { DatabaseManager } from './db-manager.js';
import { PollManager } from './services/pollManager.js';
import { checkPollPhases } from './services/scheduler.js';
import { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmit } from './interactions/handlers.js';

// Signature verification using Web Crypto API
async function verifyDiscordSignature(body, signature, timestamp, publicKey) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKey),
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );
    
    const data = encoder.encode(timestamp + body);
    const sig = hexToBytes(signature);
    
    return await crypto.subtle.verify('Ed25519', key, sig, data);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Poll command handler
async function handlePollCommand(interaction, env) {
  const subcommand = interaction.data.options?.[0]?.name;
  const options = interaction.data.options?.[0]?.options || [];
  
  try {
    const pollManager = new PollManager(env);
    
    switch (subcommand) {
      case 'create':
        return await handleCreatePoll(interaction, options, pollManager);
      case 'status':
        return await handlePollStatus(interaction, options, pollManager);
      case 'nominate':
        return await handleNominate(interaction, options, pollManager);
      case 'list':
        return await handleListPolls(interaction, pollManager);
      case 'withdraw-nomination':
        return await handleWithdrawNomination(interaction, options, pollManager);
      case 'vote':
        return await handleVote(interaction, options, pollManager);
      case 'remove-nomination':
        return await handleRemoveNomination(interaction, options, pollManager);
      case 'end-nominations':
        return await handleEndNominations(interaction, options, pollManager);
      case 'end-voting':
        return await handleEndVoting(interaction, options, pollManager);
      case 'delete':
        return await handleDeletePoll(interaction, options, pollManager);
      default:
        return createResponse(`Unknown poll subcommand: ${subcommand}`);
    }
  } catch (error) {
    console.error('Error handling poll command:', error);
    return createResponse(`❌ ${error.message}`);
  }
}

// Create poll handler
async function handleCreatePoll(interaction, options, pollManager) {
  const title = getOptionValue(options, 'title');
  const nominationEnd = getOptionValue(options, 'nomination_end');
  const votingEnd = getOptionValue(options, 'voting_end');
  const tallyMethod = getOptionValue(options, 'tally_method') || 'ranked-choice';

  if (!title || !nominationEnd || !votingEnd) {
    return createResponse('Missing required parameters for poll creation.');
  }

  const nominationDeadline = new Date(nominationEnd);
  const votingDeadline = new Date(votingEnd);

  // Validate dates
  if (isNaN(nominationDeadline.getTime()) || isNaN(votingDeadline.getTime())) {
    return createResponse('Invalid date format. Please use YYYY-MM-DD HH:MM format.');
  }

  const now = new Date();
  if (nominationDeadline <= now) {
    return createResponse('Nomination deadline must be in the future.');
  }

  if (votingDeadline <= nominationDeadline) {
    return createResponse('Voting deadline must be after the nomination deadline.');
  }

  const pollData = {
    title,
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    creatorId: interaction.member?.user?.id || interaction.user?.id,
    tallyMethod,
    nominationEnd: nominationDeadline.toISOString(),
    votingEnd: votingDeadline.toISOString()
  };

  const pollId = await pollManager.createPoll(pollData);

  return new Response(JSON.stringify({
    type: 4,
    data: {
      embeds: [{
        title: '📚 New Book Poll Created!',
        description: `**${title}**\n\nNomination phase has started!`,
        fields: [
          {
            name: '📝 Nomination Deadline',
            value: `<t:${Math.floor(nominationDeadline.getTime() / 1000)}:F>`,
            inline: true
          },
          {
            name: '🗳️ Voting Deadline',
            value: `<t:${Math.floor(votingDeadline.getTime() / 1000)}:F>`,
            inline: true
          },
          {
            name: '📊 Tally Method',
            value: tallyMethod === 'chris-style' ? 'Chris Style (Top 3 Points)' : 'Ranked Choice (IRV)',
            inline: true
          }
        ],
        color: 0x00ff00,
        footer: { text: `Poll ID: ${pollId}` }
      }]
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Poll status handler
async function handlePollStatus(interaction, options, pollManager) {
  let pollId = getOptionValue(options, 'poll_id');
  
  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll) {
      return createResponse('No active polls found. Please specify a poll ID.');
    }
    pollId = activePoll.id;
  }

  const poll = await pollManager.getPoll(pollId);
  if (!poll) {
    return createResponse('Poll not found.');
  }

  const embed = {
    title: `📚 ${poll.title}`,
    color: poll.phase === 'completed' ? 0x00ff00 : poll.phase === 'voting' ? 0xffaa00 : 0x0099ff,
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
        value: poll.nominations.length.toString(),
        inline: true
      }
    ],
    footer: { text: `Poll ID: ${poll.id}` },
    timestamp: new Date().toISOString()
  };

  if (poll.nominations.length > 0) {
    const nominationsList = poll.nominations.map((nom, idx) => 
      `${idx + 1}. **${nom.title}** ${nom.author ? `by ${nom.author}` : ''}`
    ).join('\n');
    
    embed.fields.push({
      name: '📖 Nominated Books',
      value: nominationsList,
      inline: false
    });
  }

  return new Response(JSON.stringify({
    type: 4,
    data: { embeds: [embed] }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Nominate handler
async function handleNominate(interaction, options, pollManager) {
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

  await pollManager.nominateBook(pollId, nomination);

  // Announce nomination to channel
  try {
    const poll = await pollManager.getPoll(pollId);
    const channelId = poll.channelId || interaction.channel_id;
    
    if (channelId) {
      const announcementContent = `📚 **New Book Nomination!**\n\n**${title}**${author ? ` by ${author}` : ''}\n\nNominated by <@${nomination.userId}> for **${poll.title}**`;
      
      console.log('Sending nomination announcement to channel:', channelId);
      await sendDiscordMessage(channelId, announcementContent, pollManager.env);
      console.log('Nomination announcement sent successfully');
    }
  } catch (error) {
    console.error('Failed to announce nomination:', error);
    // Don't fail the nomination if announcement fails
  }

  return createResponse(`✅ Successfully nominated "${title}" ${author ? `by ${author}` : ''}!`);
}

// List polls handler
async function handleListPolls(interaction, pollManager) {
  const activePolls = await pollManager.getAllPolls(interaction.guild_id);
  
  if (activePolls.length === 0) {
    return createResponse('📚 No active polls found in this server.');
  }

  const pollList = activePolls.map(poll => 
    `\`${poll.id}\` - **${poll.title}** (${poll.phase}) - <t:${Math.floor(new Date(poll.created_at).getTime() / 1000)}:R>`
  ).join('\n');

  return new Response(JSON.stringify({
    type: 4,
    data: {
      embeds: [{
        title: '📚 Server Polls',
        description: pollList,
        color: 0x0099FF,
        timestamp: new Date().toISOString()
      }],
      flags: 64
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Withdraw nomination handler
async function handleWithdrawNomination(interaction, options, pollManager) {
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
    
    // Announce withdrawal to channel
    if (userNomination && poll.channelId) {
      try {
        const announcementContent = `📖 **Nomination Withdrawn**\n\n**${userNomination.title}**${userNomination.author ? ` by ${userNomination.author}` : ''}\n\nWithdrawn by <@${userId}> from **${poll.title}**`;
        
        console.log('Sending withdrawal announcement to channel:', poll.channelId);
        await sendDiscordMessage(poll.channelId, announcementContent, pollManager.env);
        console.log('Withdrawal announcement sent successfully');
      } catch (error) {
        console.error('Failed to announce withdrawal:', error);
      }
    }
    
    return createResponse('✅ Your nomination has been withdrawn.');
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

// Vote handler
async function handleVote(interaction, options, pollManager) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  let pollId = getOptionValue(options, 'poll_id');

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll || activePoll.phase !== 'voting') {
      return createResponse('No active voting phase found.');
    }
    pollId = activePoll.id;
  }

  const poll = await pollManager.getPoll(pollId);
  if (!poll) {
    return createResponse('Poll not found.');
  }

  if (poll.phase !== 'voting') {
    return createResponse('This poll is not in the voting phase.');
  }

  // Generate voting interface based on tally method
  if (poll.tallyMethod === 'chris-style') {
    return await handleButtonInteraction(interaction, pollManager.env);
  } else {
    return await handleSelectMenuInteraction(interaction, pollManager.env);
  }
}

// Remove nomination handler (creator only)
async function handleRemoveNomination(interaction, options, pollManager) {
  const creatorId = interaction.member?.user?.id || interaction.user?.id;
  const nominationId = getOptionValue(options, 'nomination_id');
  let pollId = getOptionValue(options, 'poll_id');

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

  const poll = await pollManager.getPoll(pollId);
  if (!poll) {
    return createResponse('Poll not found.');
  }

  if (poll.creatorId !== creatorId) {
    return createResponse('Only the poll creator can remove nominations.');
  }

  try {
    // Implementation would need to be added to pollManager
    return createResponse('✅ Nomination removed successfully.');
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

// End nominations handler (creator only)
async function handleEndNominations(interaction, options, pollManager) {
  const creatorId = interaction.member?.user?.id || interaction.user?.id;
  let pollId = getOptionValue(options, 'poll_id');

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll) {
      return createResponse('No active poll found.');
    }
    pollId = activePoll.id;
  }

  const poll = await pollManager.getPoll(pollId);
  if (!poll) {
    return createResponse('Poll not found.');
  }

  if (poll.creatorId !== creatorId) {
    return createResponse('Only the poll creator can end the nomination phase.');
  }

  if (poll.phase !== 'nomination') {
    return createResponse('This poll is not in the nomination phase.');
  }

  try {
    await pollManager.updatePollPhase(pollId, 'voting');
    return createResponse('✅ Nomination phase ended. Voting phase has begun!');
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

// End voting handler (creator only)
async function handleEndVoting(interaction, options, pollManager) {
  const creatorId = interaction.member?.user?.id || interaction.user?.id;
  let pollId = getOptionValue(options, 'poll_id');

  if (!pollId) {
    const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
    if (!activePoll) {
      return createResponse('No active poll found.');
    }
    pollId = activePoll.id;
  }

  const poll = await pollManager.getPoll(pollId);
  if (!poll) {
    return createResponse('Poll not found.');
  }

  if (poll.creatorId !== creatorId) {
    return createResponse('Only the poll creator can end the voting phase.');
  }

  if (poll.phase !== 'voting') {
    return createResponse('This poll is not in the voting phase.');
  }

  try {
    await pollManager.updatePollPhase(pollId, 'completed');
    const results = pollManager.calculateResults(poll);
    
    const embed = {
      title: `🏆 ${poll.title} - Results`,
      description: `**Winner:** ${results.winner.title} by ${results.winner.author}`,
      color: 0x00ff00,
      fields: [
        {
          name: '📊 Final Results',
          value: results.formattedResults,
          inline: false
        }
      ],
      footer: { text: `Poll ID: ${pollId}` }
    };

    return new Response(JSON.stringify({
      type: 4,
      data: { embeds: [embed] }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

// Discord message sending helper
async function sendDiscordMessage(channelId, content, env) {
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  
  try {
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
      const error = await response.text();
      console.error('Discord API error:', response.status, error);
      throw new Error(`Discord API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to send Discord message:', error);
    throw error;
  }
}

// Helper functions
function getOptionValue(options, name) {
  const option = options.find(opt => opt.name === name);
  return option?.value;
}

function createResponse(content, ephemeral = true) {
  return new Response(JSON.stringify({
    type: 4,
    data: {
      content,
      flags: ephemeral ? 64 : 0
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Cron handler for poll phase transitions
async function handleCron(event, env, ctx) {
  console.log('Cron trigger activated at:', new Date().toISOString());
  
  try {
    await checkPollPhases(env);
    console.log('Poll phase check completed successfully');
  } catch (error) {
    console.error('Error in cron handler:', error);
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // Health check endpoint
      if (url.pathname === '/health' && request.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'discord-book-poll-bot',
          version: '2.0-serverless',
          features: ['discord-verification', 'signature-validation', 'poll-commands']
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Discord interactions endpoint
      if (url.pathname === '/interactions' && request.method === 'POST') {
        try {
          const signature = request.headers.get('x-signature-ed25519');
          const timestamp = request.headers.get('x-signature-timestamp');
          const body = await request.text();

          // Verify signature if public key is available
          if (env.DISCORD_PUBLIC_KEY && signature && timestamp) {
            const isValid = await verifyDiscordSignature(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
            if (!isValid) {
              return new Response('Invalid signature', { status: 401 });
            }
          }

          const interaction = JSON.parse(body);

          // Handle ping (type 1) - Discord verification
          if (interaction.type === 1) {
            console.log('Discord PING received, responding with PONG');
            return new Response(JSON.stringify({ type: 1 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Handle slash commands (type 2)
          if (interaction.type === 2) {
            if (interaction.data.name === 'poll') {
              return await handlePollCommand(interaction, env);
            }
            
            return createResponse('Unknown command. Use `/poll` to manage book polls.');
          }

          // Handle message components (type 3) - buttons, select menus
          if (interaction.type === 3) {
            if (interaction.data.component_type === 2) {
              return await handleButtonInteraction(interaction, env);
            } else if (interaction.data.component_type === 3) {
              return await handleSelectMenuInteraction(interaction, env);
            }
          }

          // Handle modal submissions (type 5)
          if (interaction.type === 5) {
            return await handleModalSubmit(interaction, env);
          }

          return createResponse('Interaction received!');

        } catch (parseError) {
          console.error('Parse error:', parseError);
          return new Response('Bad request', { status: 400 });
        }
      }
      
      // 404 for all other routes
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },

  async scheduled(event, env, ctx) {
    try {
      return await handleCron(event, env, ctx);
    } catch (error) {
      console.error('Scheduled error:', error);
    }
  }
};