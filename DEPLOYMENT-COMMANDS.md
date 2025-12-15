# Discord Command Registration Guide

## Overview
Discord slash commands must be registered with the Discord API. The system reads command definitions from `src/commands/poll.js` and registers them with Discord.

## Prerequisites
- Discord bot application created in Discord Developer Portal
- Bot token (DISCORD_TOKEN) 
- Application ID (DISCORD_CLIENT_ID)
- Optional: Guild ID for server-specific commands (faster updates)

## Quick Start

### Method 1: Using .env File (Recommended)

1. Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-guild-id  # Optional: for faster guild-specific registration
```

2. Run the registration command:

```bash
# Register commands (automatically loads from .env)
npm run register-commands

# Or deploy and register in one step
npm run deploy
```

The script automatically loads environment variables from `.env` using the `dotenv` package.

This will:
- Load environment variables from `.env` file (if present)
- Read command definitions from `src/commands/poll.js`
- Register all commands with Discord API
- Display confirmation with subcommand list
- (With `npm run deploy`) Deploy the worker after registration

### Method 2: Using Environment Variables Directly

```bash
# Set environment variables
export DISCORD_TOKEN="your-bot-token"
export DISCORD_CLIENT_ID="your-client-id"
export DISCORD_GUILD_ID="your-guild-id"  # Optional

# Register commands
npm run register-commands
```

### Method 3: Direct Script Execution

```bash
# Requires .env file or environment variables already set
node src/deploy-commands.js
```

### Method 4: Manual Registration via Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your application
3. Navigate to "Slash Commands" 
4. Manually create the `/poll` command with the subcommands defined in `register-commands.js`

### Method 5: Direct API Call

```bash
curl -X PUT \
  "https://discord.com/api/v10/applications/YOUR_CLIENT_ID/commands" \
  -H "Authorization: Bot YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @commands.json
```

## Available Commands After Registration

- `/poll create` - Create a new book poll with nomination and voting deadlines
- `/poll nominate` - Nominate a book for the active poll
- `/poll status` - Check the status of a poll and see nominations
- `/poll list` - List all active polls in the server
- `/poll vote` - Vote in the active poll
- `/poll add-vote username rankings [poll_id] [force]` - Add a vote on behalf of someone else (admin/creator only)
  - `username`: Name of the person voting (used as identifier)
  - `rankings`: Comma-separated nomination numbers (e.g., "1,3,2" for chris-style or "2,1,3,4" for ranked-choice)
  - `poll_id`: Optional poll ID, defaults to most recent
  - `force`: Required to add votes to completed polls (reopens and recalculates results)
  - Requires admin or poll creator permissions
- `/poll extend [days] [poll_id] [force]` - Extend the current poll phase by 1-14 days (default: 1)
  - When in nomination phase: extends both nomination and voting deadlines
  - When in voting phase: extends only voting deadline and clears any calculated results
  - When in completed phase: requires `force: true` to reopen poll to voting phase and extend
  - Requires admin or poll creator permissions

## Verification

After registration, the commands should appear in Discord when you type `/poll`. The bot endpoint must be properly configured at:
`https://discord-book-poll-bot.miggles.workers.dev/interactions`

## Troubleshooting

- **Commands not appearing**: Wait up to 1 hour for global commands, or use guild-specific registration for instant updates
- **Invalid interaction**: Ensure the interaction endpoint URL is set correctly in Discord Developer Portal
- **Permissions error**: Verify bot has necessary permissions in the server
- **Command mismatch**: Ensure the registered commands match what the bot expects to handle

## Command Updates

When updating command parameters or descriptions:
1. Update `register-commands.js`
2. Re-run the registration script
3. Commands update immediately for guild-specific, up to 1 hour for global