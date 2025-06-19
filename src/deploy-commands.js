// Deploy-time command registration for Cloudflare Workers
// Reads commands from src/commands/poll.js and registers with Discord during deployment

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Optional for guild-specific commands

// Define the poll command structure directly
const pollCommand = {
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
            name: 'nomination_end',
            description: 'Nomination deadline (YYYY-MM-DD HH:MM)',
            type: 3, // STRING
            required: true
          },
          {
            name: 'voting_end',
            description: 'Voting deadline (YYYY-MM-DD HH:MM)',
            type: 3, // STRING
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
            description: 'Link to book',
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
        description: 'List all polls',
        type: 1 // SUB_COMMAND
      },
      {
        name: 'withdraw-nomination',
        description: 'Withdraw your nomination from the active poll',
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
        name: 'vote',
        description: 'Vote in the active poll',
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
        name: 'remove-nomination',
        description: 'Remove a nomination (creator only)',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'nomination_id',
            description: 'Nomination ID to remove',
            type: 3, // STRING
            required: true
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
        name: 'end-nominations',
        description: 'End nomination phase and start voting (creator only)',
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
        description: 'End voting phase and show results (creator only)',
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
  }
};

async function deployCommands() {
  if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables');
    process.exit(1);
  }

  // Extract command data from pollCommand structure
  const commands = [pollCommand.data];

  const url = GUILD_ID 
    ? `https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`;

  try {
    console.log('🚀 Deploying Discord slash commands during Worker deployment...');
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Successfully deployed ${data.length} Discord commands`);
      console.log(`📋 Commands: ${data.map(cmd => cmd.name).join(', ')}`);
      
      // Log subcommands for verification
      if (data[0]?.options) {
        const subcommands = data[0].options.map(opt => opt.name);
        console.log(`🔧 Subcommands: ${subcommands.join(', ')}`);
      }
    } else {
      const error = await response.text();
      console.error('❌ Failed to deploy Discord commands:', response.status, error);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Error during command deployment:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly (during deployment)
if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };