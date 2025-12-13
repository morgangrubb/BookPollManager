# Quick Start Guide

## Command Registration

### Register Discord Commands

Before using the bot, register slash commands with Discord.

#### Using .env File (Recommended)

1. Create a `.env` file in the project root with your credentials:

```bash
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-guild-id  # Optional: for faster guild-specific registration
```

2. Run the registration command:

```bash
npm run register-commands
```

The script automatically loads environment variables from `.env` using the `dotenv` package.

#### Using Environment Variables Directly

```bash
# Set environment variables
export DISCORD_TOKEN="your-bot-token"
export DISCORD_CLIENT_ID="your-client-id"
export DISCORD_GUILD_ID="your-guild-id"  # Optional

# Register commands
npm run register-commands
```

### Deploy to Cloudflare Workers

```bash
# Deploy and register commands in one step (recommended)
npm run deploy

# Or deploy worker only
wrangler deploy
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/poll create` | Create a new book poll with nomination and voting deadlines |
| `/poll nominate` | Nominate a book for the active poll |
| `/poll vote` | Vote in the active poll |
| `/poll status` | Check the status of a poll and see nominations |
| `/poll announce` | Announce the poll status to the channel |
| `/poll list` | List all polls in the server |
| `/poll extend [days] [poll_id] [force]` | Extend the current poll phase by 1-14 days |
| `/poll withdraw-nomination` | Withdraw your nomination from the active poll |
| `/poll remove-nomination` | Remove a nomination (admin/creator only) |
| `/poll edit-nomination` | Edit a nomination (admin/creator only) |
| `/poll end-nominations` | End nomination phase and start voting (admin/creator only) |
| `/poll end-voting` | End voting phase and show results (admin/creator only) |
| `/poll tie-break` | Resolve a tie by selecting a winner (admin/creator only) |
| `/poll delete` | Delete a poll (admin/creator only) |

## Extend Command Details

The `/poll extend` command allows extending poll deadlines:

- **`days`** (optional): Number of days to extend (1-14), defaults to 1
- **`poll_id`** (optional): Specific poll ID, defaults to most recent poll
- **`force`** (optional): Required to extend completed polls

### Behavior by Phase

- **Nomination Phase**: Extends both nomination and voting deadlines
- **Voting Phase**: Extends voting deadline and clears any calculated results
- **Completed Phase**: Requires `force: true` to reopen poll to voting phase

### Examples

```
/poll extend                          → Extend by 1 day
/poll extend days:7                   → Extend by 7 days
/poll extend days:3 poll_id:abc123    → Extend specific poll by 3 days
/poll extend days:2 force:true        → Reopen completed poll (requires force)
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- extend.test.js

# Watch mode
npm run test:watch
```

## Environment Variables

### Using .env File

Create a `.env` file in the project root:

```env
# Required for command registration
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id

# Required for worker runtime (set via wrangler secrets)
DISCORD_PUBLIC_KEY=your-public-key

# Optional
DISCORD_GUILD_ID=your-guild-id  # For faster command registration (dev)
ENVIRONMENT=production
```

**Note**: 
- `.env` is used for command registration (`npm run register-commands`)
- Worker runtime secrets must be set via `wrangler secret put`

### Required

- `DISCORD_TOKEN` - Bot token from Discord Developer Portal
- `DISCORD_PUBLIC_KEY` - Public key from Discord Developer Portal (set via wrangler)
- `DISCORD_CLIENT_ID` - Application ID from Discord Developer Portal

### Optional

- `DISCORD_GUILD_ID` - Guild ID for faster command registration (development)
- `ENVIRONMENT` - Set to "production" for deployment

## Database Setup

Initialize the D1 database:

```bash
# Create database
wrangler d1 create discord-polls

# Initialize schema
wrangler d1 execute discord-polls --file=./src/schema/init.sql
```

Update `wrangler.toml` with your database ID.

## Troubleshooting

### Commands Not Appearing in Discord

1. Wait up to 1 hour for global commands, or use guild-specific registration for instant updates
2. Verify environment variables are set correctly
3. Check Discord Developer Portal for any errors
4. Re-run `npm run register-commands`

### Command Registration Fails

1. Verify `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` are correct
2. Ensure bot has proper permissions in Discord Developer Portal
3. Check network connectivity to Discord API

### Worker Deployment Issues

1. Verify you're logged into Wrangler: `wrangler login`
2. Check `wrangler.toml` configuration
3. Ensure D1 database exists and is properly configured
4. View logs: `wrangler tail`

## Resources

- [Full Deployment Guide](DEPLOYMENT-SERVERLESS.md)
- [Command Registration Details](DEPLOYMENT-COMMANDS.md)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)