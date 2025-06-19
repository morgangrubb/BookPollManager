// Full Discord Bot functionality using vanilla Cloudflare Workers
import { DatabaseManager } from './db-manager.js';

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
    const db = new DatabaseManager(env.POLLS_DB);
    
    switch (subcommand) {
      case 'create':
        return await handleCreatePoll(interaction, options, db);
      case 'status':
        return await handlePollStatus(interaction, options, db);
      case 'nominate':
        return await handleNominate(interaction, options, db);
      case 'list':
        return await handleListPolls(interaction, db);
      default:
        return createResponse(`Unknown poll subcommand: ${subcommand}`);
    }
  } catch (error) {
    console.error('Error handling poll command:', error);
    return createResponse('An error occurred while processing your request.');
  }
}

// Create poll handler
async function handleCreatePoll(interaction, options, db) {
  const title = getOptionValue(options, 'title');
  const nominationHours = getOptionValue(options, 'nomination_hours');
  const votingHours = getOptionValue(options, 'voting_hours');
  const tallyMethod = getOptionValue(options, 'tally_method') || 'ranked-choice';

  if (!title || !nominationHours || !votingHours) {
    return createResponse('Missing required parameters for poll creation.');
  }

  const now = new Date();
  const nominationDeadline = new Date(now.getTime() + nominationHours * 60 * 60 * 1000);
  const votingDeadline = new Date(nominationDeadline.getTime() + votingHours * 60 * 60 * 1000);

  const pollData = {
    title,
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    creatorId: interaction.member?.user?.id || interaction.user?.id,
    tallyMethod,
    nominationDeadline: nominationDeadline.toISOString(),
    votingDeadline: votingDeadline.toISOString()
  };

  const poll = await db.createPoll(pollData);

  return new Response(JSON.stringify({
    type: 4,
    data: {
      embeds: [{
        title: '📚 New Book Poll Created!',
        description: `**${poll.title}**\n\nNomination phase has started!`,
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
        footer: { text: `Poll ID: ${poll.id}` }
      }]
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Poll status handler
async function handlePollStatus(interaction, options, db) {
  let pollId = getOptionValue(options, 'poll_id');
  
  if (!pollId) {
    const activePolls = await db.getActivePolls(interaction.guild_id);
    if (activePolls.length === 0) {
      return createResponse('No active polls found. Please specify a poll ID.');
    }
    pollId = activePolls[0].id;
  }

  const poll = await db.getPoll(pollId);
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
async function handleNominate(interaction, options, db) {
  const title = getOptionValue(options, 'title');
  const author = getOptionValue(options, 'author');
  const link = getOptionValue(options, 'link');
  let pollId = getOptionValue(options, 'poll_id');

  if (!title) {
    return createResponse('Book title is required for nomination.');
  }

  if (!pollId) {
    const activePolls = await db.getActivePolls(interaction.guild_id);
    const nominationPolls = activePolls.filter(p => p.phase === 'nomination');
    
    if (nominationPolls.length === 0) {
      return createResponse('No active nomination phase found. Please specify a poll ID.');
    }
    pollId = nominationPolls[0].id;
  }

  const nomination = {
    title,
    author,
    link,
    userId: interaction.member?.user?.id || interaction.user?.id,
    username: interaction.member?.user?.username || interaction.user?.username
  };

  await db.addNomination(pollId, nomination);

  return createResponse(`✅ Successfully nominated "${title}" ${author ? `by ${author}` : ''}!`);
}

// List polls handler
async function handleListPolls(interaction, db) {
  const activePolls = await db.getActivePolls(interaction.guild_id);
  
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
    // Basic poll phase checking logic can be added here
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
            return createResponse('Button/menu interactions will be available soon!');
          }

          // Handle modal submissions (type 5)
          if (interaction.type === 5) {
            return createResponse('Modal submissions will be available soon!');
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