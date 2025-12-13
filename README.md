# Discord Book Poll Bot

A serverless Discord bot for managing book club polls with ranked choice voting, built for Cloudflare Workers.

## Features

- **Poll Creation**: Create polls with nomination and voting phases
- **Poll Extension**: Extend active or completed polls with force protection
- **Voting Systems**: 
  - Ranked Choice (Instant Runoff Voting)
  - Chris Style (Top 3 with points: 3-2-1)
- **Smart Interface**: Dropdown menus for easy voting
- **Automatic Scheduling**: Phase transitions via Cloudflare Cron
- **Private Voting**: All votes are confidential

## Architecture

- **Runtime**: Cloudflare Workers (serverless)
- **Database**: Cloudflare D1 (SQLite)
- **Integration**: Discord Webhooks
- **Scheduling**: Cloudflare Cron Triggers

## Deployment

See [DEPLOYMENT-SERVERLESS.md](DEPLOYMENT-SERVERLESS.md) for complete setup instructions.

## Project Structure

```
src/
├── index.js              # Main Worker handler
├── commands/poll.js      # Discord slash commands
├── interactions/         # Button/dropdown handlers
├── services/
│   ├── pollManager.js    # Poll business logic
│   └── scheduler.js      # Cron job handlers
├── schema/init.sql       # Database schema
└── utils/                # Voting algorithms
```

## Quick Start

### 1. Set up Environment Variables

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-guild-id  # Optional: for faster registration
```

### 2. Register Discord Commands

```bash
# Register slash commands with Discord
npm run register-commands
```

### 3. Set up Cloudflare D1 Database

```bash
# Create database
wrangler d1 create discord-polls

# Initialize schema
wrangler d1 execute discord-polls --file=./src/schema/init.sql
```

### 4. Deploy to Cloudflare Workers

```bash
# Deploy and register commands in one step
npm run deploy

# Or deploy worker only
wrangler deploy
```

Full instructions in [DEPLOYMENT-SERVERLESS.md](DEPLOYMENT-SERVERLESS.md).

## Available Commands

- `/poll create` - Create a new book poll
- `/poll nominate` - Nominate a book
- `/poll vote` - Vote in the active poll
- `/poll extend [days] [poll_id] [force]` - Extend poll by 1-14 days (force required for completed polls)
- `/poll status` - Check poll status
- `/poll list` - List all polls
- `/poll end-nominations` - Start voting phase early
- `/poll end-voting` - Complete poll and show results
- `/poll delete` - Delete a poll

See [QUICK_START.md](QUICK_START.md) for complete command reference.

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- extend.test.js

# Watch mode
npm run test:watch
```