# Serverless Discord Bot Deployment Guide

## Overview

This guide covers deploying the Discord Book Poll Bot to Cloudflare Workers as a serverless application.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Discord Application**: Create bot in Discord Developer Portal
3. **Discord Application**: Configure webhook interactions
4. **Node.js**: Version 18+ for local development

## Setup Steps

### 1. Install Dependencies

```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Install project dependencies
npm install
```

### 2. Configure Wrangler

```bash
# Authenticate with Cloudflare
wrangler login

# Create D1 database for poll data storage
wrangler d1 create discord-polls

# Initialize database schema
wrangler d1 execute discord-polls --file=./src/schema/init.sql
```

Update `wrangler.toml` with your D1 database ID:
```toml
[[d1_databases]]
binding = "POLLS_DB"
database_name = "discord-polls"
database_id = "your-d1-database-id"
```

### 3. Set Environment Variables

```bash
# Discord configuration
wrangler secret put DISCORD_TOKEN
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_CLIENT_ID

# All required environment variables configured
```

### 4. Configure Discord Webhook

1. Go to Discord Developer Portal
2. Navigate to your bot application
3. Go to General Information > Interactions Endpoint URL
4. Set to: `https://your-worker.your-subdomain.workers.dev/interactions`
5. Save changes

### 5. Deploy

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# View logs
wrangler tail
```

## Environment Variables

### Required Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_PUBLIC_KEY` | Public key from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Application ID from Discord Developer Portal |

### Firebase Variables (Priority Order)

| Variable | Fallback | Description |
|----------|----------|-------------|
| `X_FIREBASE_PROJECT_ID` | `FIREBASE_PROJECT_ID` | Firebase project ID |
| `X_FIREBASE_SERVICE_ACCOUNT_KEY` | `FIREBASE_SERVICE_ACCOUNT_KEY` | Service account JSON (as string) |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `ENVIRONMENT` | Set to "production" for deployment |

## Architecture Changes

### From Gateway to Webhooks

The serverless version uses Discord's webhook system instead of maintaining a persistent WebSocket connection:

- **Original**: Discord Gateway API with persistent connection
- **Serverless**: HTTP webhooks for interaction handling

### From Node-Cron to Cloudflare Cron

Scheduled tasks now use Cloudflare's cron triggers:

- **Original**: `node-cron` with 1-minute intervals
- **Serverless**: Cloudflare cron triggers every 5 minutes

### Database Architecture

Cloudflare D1 SQLite database provides:

- **Relational Structure**: Proper foreign keys and constraints
- **Performance**: Edge-optimized SQLite queries
- **Scalability**: Automatic replication and backups

### Temporary Data Storage

User voting selections stored in D1 database:

- **Original**: In-memory Map storage
- **Serverless**: D1 voting_sessions table with TTL cleanup

## Key Differences

### Limitations

1. **No Guild Member Fetching**: Cannot automatically detect when all members have voted
2. **Stateless Operations**: No persistent connections required
3. **Stateless**: No persistent memory between requests
4. **Cron Frequency**: Poll phase checks every 5 minutes instead of 1 minute

### Benefits

1. **Zero Server Management**: Fully managed infrastructure
2. **Automatic Scaling**: Handles traffic spikes automatically
3. **Cost Effective**: Pay-per-request pricing
4. **Global Distribution**: Low latency worldwide
5. **High Availability**: Built-in redundancy

## Testing

### Local Development

```bash
# Start local development server
wrangler dev

# Test interactions locally
# Note: Discord interactions must be configured to point to ngrok or similar tunnel
```

### Production Testing

1. Deploy to Cloudflare Workers
2. Update Discord webhook URL
3. Test slash commands in Discord server
4. Monitor logs with `wrangler tail`

## Troubleshooting

### Common Issues

1. **Discord Webhook Verification Fails**
   - Ensure `DISCORD_PUBLIC_KEY` is correct
   - Check webhook URL in Discord Developer Portal

2. **Database Connection Issues**
   - Verify D1 database ID in wrangler.toml
   - Check database schema initialization

3. **Cron Jobs Not Running**
   - Verify cron trigger syntax in `wrangler.toml`
   - Check Cloudflare dashboard for cron job logs

### Debug Commands

```bash
# View worker logs
wrangler tail

# Check worker metrics
wrangler dev --inspect

# List secrets
wrangler secret list
```

## Monitoring

### Cloudflare Analytics

Monitor worker performance:
- Request volume
- Response times  
- Error rates
- CPU usage

### Discord Bot Status

Health check endpoint: `https://your-worker.workers.dev/health`

Returns bot status and connectivity information.

## Security

### Best Practices

1. Store all secrets using `wrangler secret put`
2. Verify Discord request signatures
3. Use environment-specific configurations
4. Monitor access logs regularly
5. Implement rate limiting if needed

### Database Security

1. Use prepared statements for all queries
2. Validate all inputs before database operations
3. Monitor query performance and access patterns
4. Regular backup verification

## Cost Optimization

### Cloudflare Workers Pricing

- **Free Tier**: 100,000 requests/day
- **Paid Plan**: $5/month for 10M requests
- **Additional**: $0.50 per million requests

### Optimization Tips

1. Cache frequently accessed data
2. Optimize D1 queries with proper indexing
3. Use efficient data serialization
4. Implement request deduplication
5. Monitor usage patterns

## Backup and Recovery

### Data Backup

Cloudflare D1 provides automatic backups and replication:

1. Point-in-time recovery available
2. Regular backup verification recommended
2. Backup critical configuration
3. Document deployment procedures
4. Test recovery scenarios

### Disaster Recovery

1. Multiple deployment environments
2. Automated deployment pipelines
3. Configuration version control
4. Health monitoring alerts

## Support

For issues with:
- **Cloudflare Workers**: [Cloudflare Support](https://support.cloudflare.com)
- **Discord API**: [Discord Developer Support](https://discord.com/developers/docs)
- **Cloudflare**: [Cloudflare Support](https://support.cloudflare.com/)