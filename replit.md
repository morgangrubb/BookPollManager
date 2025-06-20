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

- June 20, 2025: Updated ranked choice voting to use dropdown selects instead of text input
  - Ranked choice voting now uses the same select dropdown interface as chris-style voting
  - Users can rank up to 5 books using separate dropdown menus for 1st, 2nd, 3rd, 4th, and 5th choices
  - First choice is required, additional choices are optional
  - Includes submit button and real-time selection tracking with voting sessions
  - Provides consistent user experience across both voting methods
- June 20, 2025: Fixed three critical UI/UX issues for better user experience
  - Fixed nomination announcements to include clickable book links in channel notifications
  - Enhanced book link display in poll status with proper Discord markdown formatting
  - Improved poll list timestamp handling to show "Recently created" instead of "Unknown date"
  - All link formatting now working correctly across status displays and announcements
  - Poll list now handles missing creation dates gracefully with fallback messaging
- June 20, 2025: Completed comprehensive bot improvements and bug fixes
  - Fixed poll list display: removed "NaN" timestamps, added proper pagination for >10 polls
  - Enhanced nomination links: book links now display as clickable elements in poll status
  - Fixed voting interface: resolved startsWith errors, properly imports voting generators
  - Added voting phase announcements: automatic channel notifications when nominations end
  - Improved user experience: better error handling and visual feedback throughout
  - Poll deletion functionality fully operational with proper permissions and confirmations
  - All major bot functionality now working correctly with enhanced features
- June 20, 2025: Added poll deletion functionality for creators and server admins
  - New `/poll delete` subcommand with poll ID and confirmation requirements
  - Permission checks: only poll creator or server administrators can delete polls
  - Requires typing "DELETE" exactly to confirm deletion (prevents accidental deletions)
  - Cascading deletion removes all related data (nominations, votes, voting sessions)
  - Automatic channel announcement when poll is deleted with user attribution
  - Comprehensive error handling for missing polls and permission failures
- June 19, 2025: Added poll creator information to status responses
  - Poll status now displays creator mention in the description line
  - Shows "Created by @username" when creator information is available
  - Helps users identify who started each poll for better context
  - Works around Discord API limitations with embed field filtering
- June 19, 2025: Fixed Discord API rate limiting issues for channel announcements
  - Added proper rate limiting handling for Discord API calls (HTTP 429 errors)
  - Implemented 500ms delay between announcement requests to prevent rate limits
  - Made channel announcements optional - nominations/withdrawals succeed even if announcements fail
  - Enhanced error logging to distinguish between critical and non-critical failures
  - Prevents nomination/withdrawal operations from failing due to announcement issues
- June 19, 2025: Enhanced user experience for duplicate nominations
  - Updated nomination handler to detect when user already has a nomination
  - Shows existing nomination details instead of generic error message
  - Provides helpful guidance to use withdraw-nomination command for changes
  - Improved error messaging for better user understanding
- June 19, 2025: Refactored code organization for better maintainability
  - Moved all poll handler functions from index.js to interactions/handlers.js
  - Removed outdated index-*.js files (index-full.js, index-minimal.js, index-simple.js, index-vanilla.js)
  - Consolidated all poll command logic in centralized handlers module
  - Improved code separation between routing (index.js) and business logic (handlers.js)
  - Enhanced maintainability and readability of codebase
- June 19, 2025: Added channel announcements for nominations and withdrawals
  - Implemented automatic channel announcements when users nominate books
  - Added withdrawal announcements when users remove their nominations
  - Messages include book details, user mentions, and poll context
  - Announcements sent to the poll's designated channel using Discord API
  - Added error handling to prevent nomination failures if announcements fail
  - Enhanced user engagement with real-time poll activity notifications
- June 19, 2025: Implemented deployment-integrated command registration system
  - Created automatic Discord command registration during Cloudflare Worker deployment
  - Replaced separate register-commands.js with src/deploy-commands.js that runs during build
  - Commands are automatically registered with every `wrangler deploy` execution
  - Updated wrangler.toml with build command integration for seamless deployment
  - All 9 subcommands automatically deployed and synchronized with code changes
  - Eliminated need for separate command registration workflows or manual steps
  - Deployment logs show command registration success with subcommand verification
- June 19, 2025: Fully integrated existing services and restored all advanced poll commands
  - Integrated PollManager, scheduler, and voting utilities (chrisStyle.js, rankedChoice.js) into vanilla index.js
  - Restored all advanced commands: withdraw-nomination, vote, remove-nomination, end-nominations, end-voting
  - Added proper creator-only permissions for poll management commands
  - Integrated button and select menu interaction handlers for voting interfaces
  - Updated cron handler to use scheduler service for automated poll phase transitions
  - Successfully registered all 9 poll subcommands with Discord API
  - Bot now supports both chris-style and ranked-choice voting with proper UI interactions
  - Complete serverless architecture with full Discord bot functionality operational
- June 19, 2025: Discord slash commands successfully registered and bot fully operational
  - Registered `/poll` command with Discord API including all subcommands (create, nominate, status, list)
  - Fixed parameter alignment between Discord command definitions and bot handlers
  - Bot now uses `nomination_end` and `voting_end` date parameters as originally designed
  - Commands are live and discoverable in Discord servers where bot is installed
  - Created command registration script and deployment documentation
  - All functionality verified: poll creation, nomination, status checking, and listing
  - Bot endpoint properly configured at: https://discord-book-poll-bot.miggles.workers.dev/interactions
- June 19, 2025: Successfully restored full Discord bot functionality
  - Fixed "Missing required parameters" error by implementing auto-initializing database schema
  - Database manager now automatically creates required tables if they don't exist
  - Bot passes Discord verification (PING/PONG) and handles signature verification
- June 19, 2025: Completely rebuilt Discord bot using vanilla Cloudflare Workers
  - Eliminated external dependency issues (discord-interactions, itty-router) causing Worker exceptions
  - Implemented signature verification using native Web Crypto API instead of external libraries
  - Created custom vanilla router and database manager for improved reliability
  - Fixed all timeout issues by removing problematic external packages
- June 19, 2025: Fixed Cloudflare Workers timeout issues
  - Added comprehensive timeout protection to all database operations (5-8 second limits)
  - Optimized D1 database query handling with Promise.race timeout management
  - Fixed infinite loop potential in poll data aggregation with LIMIT clauses
  - Added error handling for malformed JSON in database results
- June 19, 2025: Removed traditional Node.js version completely
  - Deleted all traditional Node.js files (index.js, commands/, services/, utils/, config/)
  - Removed Node.js dependencies (discord.js, dotenv, node-cron)
  - Removed all Firebase integration and dependencies
  - Project now contains only serverless Cloudflare Workers implementation
  - Simplified project structure focused on /src directory
  - Clean serverless-only codebase ready for Cloudflare Workers deployment
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