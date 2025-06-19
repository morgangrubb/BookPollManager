# Discord Book Poll Bot

A serverless Discord bot for managing book club polls with ranked choice voting, built for Cloudflare Workers.

## Features

- **Poll Creation**: Create polls with nomination and voting phases
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

1. Set up Cloudflare D1 database
2. Configure Discord webhook
3. Deploy to Cloudflare Workers
4. Register slash commands

Full instructions in deployment documentation.