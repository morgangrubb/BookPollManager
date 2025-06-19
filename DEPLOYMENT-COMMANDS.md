# Discord Command Registration Guide

## Overview
Discord slash commands must be registered with Discord before they can be used. This guide explains how to register the poll commands for your Discord bot.

## Prerequisites
- Discord bot application created in Discord Developer Portal
- Bot token (DISCORD_TOKEN)
- Application ID (DISCORD_CLIENT_ID)
- Optional: Guild ID for server-specific commands (faster updates)

## Registration Methods

### Method 1: Using the Registration Script (Recommended)

1. Set your environment variables:
```bash
export DISCORD_TOKEN="your_bot_token_here"
export DISCORD_CLIENT_ID="your_application_id_here"
export DISCORD_GUILD_ID="your_guild_id_here"  # Optional for faster registration
```

2. Run the registration script:
```bash
npm run register-commands
```

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