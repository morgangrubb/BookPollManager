# Discord Command Registration Guide

## Overview
Discord slash commands are automatically registered during Cloudflare Worker deployment. The system reads command definitions from `src/commands/poll.js` and registers them with Discord as part of the deployment process.

## Prerequisites
- Discord bot application created in Discord Developer Portal
- Bot token (DISCORD_TOKEN) 
- Application ID (DISCORD_CLIENT_ID)
- Optional: Guild ID for server-specific commands (faster updates)

## Automatic Registration

Commands are automatically registered during `wrangler deploy`:

1. Set your environment variables in Replit Secrets:
   - `DISCORD_TOKEN` - Your bot token
   - `DISCORD_CLIENT_ID` - Your application ID  
   - `DISCORD_GUILD_ID` - Optional guild ID for faster registration

2. Deploy the worker:
```bash
wrangler deploy
```

The build process will automatically:
- Read command definitions from `src/commands/poll.js`
- Register all commands with Discord API
- Verify successful registration
- Deploy the worker with updated commands

### Method 2: Manual Registration via Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your application
3. Navigate to "Slash Commands" 
4. Manually create the `/poll` command with the subcommands defined in `register-commands.js`

### Method 3: Direct API Call

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