// Database operations for Cloudflare D1
export class DatabaseManager {
  constructor(db) {
    this.db = db;
  }

  // Generate unique poll ID
  generatePollId() {
    return Math.random().toString(36).substring(2, 15);
  }

  // Create new poll
  async createPoll(pollData) {
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