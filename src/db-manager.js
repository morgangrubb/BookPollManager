// Database operations for Cloudflare D1
export class DatabaseManager {
  constructor(db) {
    this.db = db;
    this.initialized = false;
  }

  // Initialize database schema if it doesn't exist
  async initializeSchema() {
    if (this.initialized) return;
    
    try {
      // Create polls table
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS polls (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          creator_id TEXT NOT NULL,
          creator_username TEXT,
          phase TEXT NOT NULL DEFAULT 'nomination',
          tally_method TEXT NOT NULL DEFAULT 'ranked-choice',
          nomination_deadline TEXT NOT NULL,
          voting_deadline TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          results_data TEXT
        )
      `).run();

      // Add creator_username column if it doesn't exist (for existing databases)
      try {
        await this.db.prepare(`
          ALTER TABLE polls ADD COLUMN creator_username TEXT
        `).run();
      } catch (error) {
        // Column already exists or other non-critical error, continue
        if (!error.message.includes('duplicate column name')) {
          console.log('Note: creator_username column may already exist');
        }
      }

      // Create nominations table
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS nominations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          poll_id TEXT NOT NULL,
          title TEXT NOT NULL,
          author TEXT,
          link TEXT,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();

      // Create votes table
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          poll_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          rankings TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(poll_id, user_id)
        )
      `).run();

      // Create voting sessions table
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS voting_sessions (
          user_key TEXT PRIMARY KEY,
          poll_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          selections TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        )
      `).run();

      this.initialized = true;
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error;
    }
  }

  // Generate unique poll ID
  generatePollId() {
    return Math.random().toString(36).substring(2, 15);
  }

  // Create new poll
  async createPoll(pollData) {
    await this.initializeSchema();
    
    const pollId = this.generatePollId();
    const now = new Date().toISOString();

    try {
      await this.db.prepare(`
        INSERT INTO polls (id, title, guild_id, channel_id, creator_id, phase, tally_method, nomination_deadline, voting_deadline, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'nomination', ?, ?, ?, ?, ?)
      `).bind(
        pollId,
        pollData.title,
        pollData.guildId,
        pollData.channelId,
        pollData.creatorId,
        pollData.tallyMethod,
        pollData.nominationDeadline,
        pollData.votingDeadline,
        now,
        now
      ).run();

      return { id: pollId, ...pollData, phase: 'nomination', createdAt: now };
    } catch (error) {
      console.error('Error creating poll:', error);
      throw error;
    }
  }

  // Get poll by ID
  async getPoll(pollId) {
    await this.initializeSchema();
    
    try {
      const poll = await this.db.prepare(`
        SELECT * FROM polls WHERE id = ?
      `).bind(pollId).first();

      if (!poll) return null;

      // Get nominations
      const nominations = await this.db.prepare(`
        SELECT * FROM nominations WHERE poll_id = ? ORDER BY created_at ASC
      `).bind(pollId).all();

      // Get votes
      const votes = await this.db.prepare(`
        SELECT * FROM votes WHERE poll_id = ? ORDER BY created_at ASC
      `).bind(pollId).all();

      return {
        id: poll.id,
        title: poll.title,
        guildId: poll.guild_id,
        channelId: poll.channel_id,
        creatorId: poll.creator_id,
        phase: poll.phase,
        tallyMethod: poll.tally_method,
        nominationDeadline: poll.nomination_deadline,
        votingDeadline: poll.voting_deadline,
        createdAt: poll.created_at,
        nominations: nominations.results || [],
        votes: (votes.results || []).map(vote => ({
          ...vote,
          rankings: JSON.parse(vote.rankings || '[]')
        }))
      };
    } catch (error) {
      console.error('Error getting poll:', error);
      throw error;
    }
  }

  // Add nomination
  async addNomination(pollId, nomination) {
    await this.initializeSchema();
    
    const now = new Date().toISOString();
    
    try {
      await this.db.prepare(`
        INSERT INTO nominations (poll_id, title, author, link, user_id, username, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        pollId,
        nomination.title,
        nomination.author || null,
        nomination.link || null,
        nomination.userId,
        nomination.username,
        now
      ).run();

      return true;
    } catch (error) {
      console.error('Error adding nomination:', error);
      throw error;
    }
  }

  // Submit vote
  async submitVote(pollId, userId, rankings) {
    const now = new Date().toISOString();
    
    try {
      await this.db.prepare(`
        INSERT INTO votes (poll_id, user_id, rankings, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        pollId,
        userId,
        JSON.stringify(rankings),
        now
      ).run();

      return true;
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  }

  // Get active polls for guild
  async getActivePolls(guildId) {
    await this.initializeSchema();
    
    try {
      const polls = await this.db.prepare(`
        SELECT * FROM polls 
        WHERE guild_id = ? AND phase IN ('nomination', 'voting')
        ORDER BY created_at DESC
      `).bind(guildId).all();

      return polls.results || [];
    } catch (error) {
      console.error('Error getting active polls:', error);
      return [];
    }
  }

  // Update poll phase
  async updatePollPhase(pollId, newPhase) {
    const now = new Date().toISOString();
    
    try {
      await this.db.prepare(`
        UPDATE polls SET phase = ?, updated_at = ? WHERE id = ?
      `).bind(newPhase, now, pollId).run();

      return true;
    } catch (error) {
      console.error('Error updating poll phase:', error);
      throw error;
    }
  }
}