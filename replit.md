# Discord Book Poll Bot

## Overview

This is a serverless Discord bot designed to facilitate book club polls using ranked choice voting (Instant Runoff Voting). Built specifically for Cloudflare Workers deployment with D1 SQLite database. The bot allows users to create polls, nominate books during a nomination phase, and then vote using ranked preferences during a voting phase. The system automatically transitions between phases based on configured timestamps and calculates winners using the IRV algorithm.

**Current State**: Pure serverless architecture optimized for Cloudflare Workers deployment with D1 database.

## System Architecture

Serverless architecture built for Cloudflare Workers:

- **HTTP Webhook Layer**: Discord interactions via webhooks
- **Serverless Functions**: Stateless request handlers for each interaction
- **Cloudflare D1**: SQLite database for all poll data storage
- **Cloudflare Cron**: 5-minute intervals for automated poll transitions
- **D1 Sessions**: Temporary voting data stored in database with TTL cleanup

## Key Components

### Serverless Handler (src/index.js)
- **Purpose**: Main entry point for Cloudflare Workers
- **Key Features**: 
  - HTTP webhook handling for Discord interactions
  - Cron-based poll phase transitions
  - Stateless request processing
- **Rationale**: Serverless architecture provides automatic scaling and zero maintenance overhead

### Commands System (src/commands/poll.js)
- **Purpose**: Implements slash command interface for poll management
- **Key Features**:
  - Create new polls with nomination and voting deadlines
  - Nominate books during nomination phase
  - Submit ranked votes during voting phase
  - View poll status and results
- **Rationale**: Slash commands provide a modern, discoverable interface

### Poll Management Service (src/services/pollManager.js)
- **Purpose**: Core business logic for poll lifecycle management
- **Key Features**:
  - D1 database operations for polls
  - Phase transition management (nomination → voting → completed)
  - Vote collection and validation
  - Integration with ranked choice voting algorithm
- **Rationale**: Centralized poll logic with D1 database integration

### Scheduler Service (src/services/scheduler.js)
- **Purpose**: Automated poll phase transitions via Cloudflare Cron
- **Key Features**:
  - Cron triggers every 5 minutes
  - Automatic phase transitions when deadlines are reached
  - Poll completion and result calculation
- **Rationale**: Serverless cron ensures reliable automated transitions

### Ranked Choice Voting (utils/rankedChoice.js)
- **Purpose**: Implements Instant Runoff Voting algorithm
- **Key Features**:
  - Multi-round elimination process
  - Preference redistribution logic
  - Detailed round-by-round results tracking
- **Rationale**: IRV provides fair representation for group decision-making, allowing voters to express nuanced preferences

## Data Flow

1. **Poll Creation**: User creates poll via slash command → Data stored in D1 database → Poll ID returned
2. **Nomination Phase**: Users nominate books → Nominations stored with poll association → Phase automatically transitions based on timestamp
3. **Voting Phase**: Users submit ranked preferences → Votes validated and stored → Phase transitions to completion
4. **Result Calculation**: IRV algorithm processes votes → Winner determined → Results stored and can be displayed

## External Dependencies

### Core Dependencies
- **Cloudflare Workers**: Serverless JavaScript runtime environment
- **Cloudflare D1**: SQLite-compatible serverless database
- **Cloudflare Cron Triggers**: Automated scheduling for poll transitions

### Discord Platform
- **Discord Developer Portal**: Application registration and webhook configuration
- **Discord Webhooks**: HTTP-based interaction handling for serverless deployment

## Deployment Strategy

Serverless deployment on Cloudflare Workers:

- **Runtime**: Cloudflare Workers V8 JavaScript runtime
- **Database**: Cloudflare D1 SQLite database
- **Webhooks**: Discord interaction webhooks
- **Cron**: Cloudflare scheduled events

**Environment Requirements**:
- Discord webhook credentials (TOKEN, PUBLIC_KEY, CLIENT_ID)
- Cloudflare D1 database binding
- Optional guild ID for server-specific commands

## Recent Changes

- June 19, 2025: Removed traditional Node.js version completely
  - Deleted all traditional Node.js files (index.js, commands/, services/, utils/, config/)
  - Removed Node.js dependencies (discord.js, dotenv, node-cron)
  - Project now contains only serverless Cloudflare Workers implementation
  - Simplified project structure focused on /src directory
- June 18, 2025: Discord bot fully operational with enhanced results display
  - Bot successfully connects to Discord as "Book Poll#3846"
  - Cloudflare D1 SQLite database created and working
  - All slash commands registered and functional
  - Smart poll detection: nominate and vote commands auto-detect active polls
  - Advanced poll management: early phase endings, nomination removal
  - Automatic completion when all members have voted
  - Enhanced poll status with numbered nominations for easy management
  - Creator-only controls for poll management
  - User restrictions: one nomination per user, no modifications during voting/completed phases
  - Public announcements: nomination notifications and vote progress percentages
  - Self-service nomination withdrawal during nomination phase
  - Prioritized active poll detection for seamless user experience
  - Automated scheduler running for poll phase transitions
  - Fixed timeout issues with deferred responses and member fetching
  - Enhanced results display: shows runners-up in descending score order for completed polls
  - Improved ranked choice voting algorithm with final standings tracking
  - Added automatic voting phase announcements when nominations end (both scheduled and manual)
  - Comprehensive voting announcements include all nominated books for easy reference
  - Implemented chris-style voting method as alternative to ranked choice
  - Chris-style adapts to nomination count: 3+ books use top 3 (3pts/2pts/1pt), fewer books rank all available
  - Optional tally method selection during poll creation (ranked-choice or chris-style)
  - Completed polls show appropriate results format based on tally method
  - Added comprehensive poll completion announcements showing all results for both voting methods
  - Chris-style completion shows all books with points in descending order
  - Ranked choice completion shows all books from winner to least voted option
  - Poll listings now ordered by creation timestamp (newest first) with relative timestamps
  - Enhanced poll list display includes tally method and creation date information
  - Added HTTP health check server on port 8080 for monitoring and deployment compatibility
  - Health endpoint returns bot status, connection state, timestamp, and uptime information
  - Updated chris-style voting to use dropdown menus instead of text input modal
  - Three dropdown menus: First choice (always), Second choice (2+ nominations), Third choice (3+ nominations)
  - Temporary vote tracking system for multi-step dropdown selections with duplicate validation
  - Enhanced user experience with selection status feedback and automatic vote submission
  - Removed all Firebase dependencies and configuration
  - Complete serverless conversion for Cloudflare Workers deployment
  - Webhook-based Discord interactions replacing Gateway API connection
  - Replaced Firebase with Cloudflare D1 SQLite database for improved performance
  - D1 database schema with polls, nominations, votes, and voting_sessions tables
  - Temporary voting session management with automatic TTL cleanup
  - Automated cron triggers for poll phase transitions (5-minute intervals)
  - Comprehensive deployment documentation for serverless architecture
  - Production ready for Cloudflare Workers hosting only

## Changelog

- June 18, 2025. Initial setup and deployment

## User Preferences

Preferred communication style: Simple, everyday language.