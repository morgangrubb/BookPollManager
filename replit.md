# Discord Book Poll Bot

## Overview

This is a Discord bot designed to facilitate book club polls using ranked choice voting (Instant Runoff Voting). The bot allows users to create polls, nominate books during a nomination phase, and then vote using ranked preferences during a voting phase. The system automatically transitions between phases based on configured timestamps and calculates winners using the IRV algorithm.

## System Architecture

The application follows a modular Node.js architecture with clear separation of concerns:

- **Discord Bot Layer**: Handles Discord interactions and slash commands
- **Service Layer**: Manages business logic for polls, Firebase operations, and scheduling
- **Utility Layer**: Implements ranked choice voting calculations
- **Configuration Layer**: Centralizes environment variable management

The bot uses an event-driven architecture with scheduled tasks for automatic poll phase transitions.

## Key Components

### Discord Bot (index.js)
- **Purpose**: Main entry point and Discord client initialization
- **Key Features**: 
  - Sets up Discord intents for guild messages and interactions
  - Registers slash commands dynamically
  - Handles interaction routing to appropriate command handlers
- **Rationale**: Centralized bot initialization ensures proper setup of all services before handling user interactions

### Commands System (commands/poll.js)
- **Purpose**: Implements slash command interface for poll management
- **Key Features**:
  - Create new polls with nomination and voting deadlines
  - Nominate books during nomination phase
  - Submit ranked votes during voting phase
  - View poll status and results
- **Rationale**: Slash commands provide a modern, discoverable interface that's easier for users than text-based commands

### Poll Management Service (services/pollManager.js)
- **Purpose**: Core business logic for poll lifecycle management
- **Key Features**:
  - CRUD operations for polls
  - Phase transition management (nomination → voting → completed)
  - Vote collection and validation
  - Integration with ranked choice voting algorithm
- **Rationale**: Centralized poll logic ensures consistency and makes the system easier to maintain and test

### Firebase Integration (services/firebase.js)
- **Purpose**: Database operations and Firebase SDK initialization
- **Key Features**:
  - Firestore database connection management
  - Document-based storage for polls, nominations, and votes
  - Real-time data synchronization capabilities
- **Rationale**: Firebase provides scalable, real-time database functionality without requiring server infrastructure management

### Scheduler Service (services/scheduler.js)
- **Purpose**: Automated poll phase transitions based on timestamps
- **Key Features**:
  - Cron-based polling every minute
  - Automatic phase transitions when deadlines are reached
  - Poll completion and result calculation
- **Rationale**: Automated transitions ensure polls progress without manual intervention, improving user experience

### Ranked Choice Voting (utils/rankedChoice.js)
- **Purpose**: Implements Instant Runoff Voting algorithm
- **Key Features**:
  - Multi-round elimination process
  - Preference redistribution logic
  - Detailed round-by-round results tracking
- **Rationale**: IRV provides fair representation for group decision-making, allowing voters to express nuanced preferences

## Data Flow

1. **Poll Creation**: User creates poll via slash command → Data stored in Firebase → Poll ID returned
2. **Nomination Phase**: Users nominate books → Nominations stored with poll association → Phase automatically transitions based on timestamp
3. **Voting Phase**: Users submit ranked preferences → Votes validated and stored → Phase transitions to completion
4. **Result Calculation**: IRV algorithm processes votes → Winner determined → Results stored and can be displayed

## External Dependencies

### Core Dependencies
- **discord.js (v14.20.0)**: Discord API wrapper for bot functionality
- **firebase-admin (v13.4.0)**: Firebase SDK for database operations
- **node-cron (v4.1.0)**: Cron job scheduling for automated tasks

### Firebase Services
- **Firestore**: NoSQL document database for storing polls, nominations, and votes
- **Authentication**: Service account-based authentication for server-to-server communication

### Discord Platform
- **Discord Developer Portal**: Application registration and bot token management
- **Discord Gateway**: Real-time event handling and slash command registration

## Deployment Strategy

The application is configured for Replit deployment with:

- **Runtime**: Node.js 20 with Nix package management
- **Auto-installation**: Dependencies installed on startup via npm
- **Environment Variables**: Secure configuration through .env files
- **Workflow Automation**: Parallel execution setup for Discord bot service

**Environment Requirements**:
- Discord bot token and application credentials
- Firebase project ID and service account key
- Optional guild ID for server-specific commands

## Recent Changes

- June 18, 2025: Discord bot fully operational with enhanced results display
  - Bot successfully connects to Discord as "Book Poll#3846"
  - Firebase Firestore database created and working
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
  - Production ready for Discord servers

## Changelog

- June 18, 2025. Initial setup and deployment

## User Preferences

Preferred communication style: Simple, everyday language.