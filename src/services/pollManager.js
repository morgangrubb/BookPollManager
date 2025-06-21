// Serverless Poll Manager for Cloudflare Workers with D1 Database
import { calculateChrisStyleWinner } from "../utils/chrisStyle.js";
import { calculateRankedChoiceWinner } from "../utils/rankedChoice.js";

export class PollManager {
  constructor(env) {
    this.env = env;
    this.db = env.POLLS_DB;
  }

  generatePollId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  async createPoll(pollData) {
    const pollId = this.generatePollId();
    const now = new Date().toISOString();

    try {
      await this.db
        .prepare(
          `
                INSERT INTO polls (
                    id, title, guild_id, channel_id, creator_id,
                    phase, tally_method, nomination_deadline, voting_deadline,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
        )
        .bind(
          pollId,
          pollData.title,
          pollData.guildId,
          pollData.channelId,
          pollData.creatorId,
          "nomination",
          pollData.tallyMethod || "ranked-choice",
          pollData.nominationEnd || pollData.nominationDeadline,
          pollData.votingEnd || pollData.votingDeadline,
          now,
          now,
        )
        .run();

      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  }

  async getPoll(pollId) {
    try {
      // Get poll data
      const pollResult = await this.db
        .prepare(
          `
                SELECT id, title, guild_id, channel_id, creator_id, phase, tally_method,
                       nomination_deadline, voting_deadline, created_at, updated_at, results_data
                FROM polls WHERE id = ?
            `,
        )
        .bind(pollId)
        .first();

      if (!pollResult) {
        console.log("no poll found");
        return null;
      }

      // Get nominations with timeout protection
      const nominationsQuery = this.db
        .prepare(
          `
                SELECT * FROM nominations WHERE poll_id = ? ORDER BY created_at ASC LIMIT 50
            `,
        )
        .bind(pollId);

      // Get votes with timeout protection
      const votesQuery = this.db
        .prepare(
          `
                SELECT * FROM votes WHERE poll_id = ? ORDER BY created_at ASC LIMIT 100
            `,
        )
        .bind(pollId);

      // Execute queries with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database timeout")), 5000);
      });

      const queryPromise = Promise.all([
        nominationsQuery.all(),
        votesQuery.all(),
      ]);

      const [nominationsResult, votesResult] = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]);

      // Build poll object safely
      const poll = {
        id: pollResult.id,
        title: pollResult.title,
        guildId: pollResult.guild_id,
        channelId: pollResult.channel_id,
        creatorId: pollResult.creator_id || null,
        phase: pollResult.phase,
        tallyMethod: pollResult.tally_method,
        nominationDeadline: pollResult.nomination_deadline,
        votingDeadline: pollResult.voting_deadline,
        createdAt: pollResult.created_at,
        updatedAt: pollResult.updated_at,
        nominations: [],
        votes: [],
        results: null,
      };

      // If poll is completed and results_data exists, use it
      if (poll.phase === "completed" && pollResult.results_data) {
        try {
          poll.results = JSON.parse(pollResult.results_data);
        } catch (e) {
          poll.results = null;
        }
      }

      // Process nominations safely
      if (nominationsResult?.results) {
        poll.nominations = nominationsResult.results.map((n) => ({
          id: n.id,
          title: n.title,
          author: n.author,
          link: n.link,
          userId: n.user_id,
          username: n.username,
          timestamp: n.created_at,
        }));
      }

      // Process votes safely
      if (votesResult?.results) {
        poll.votes = votesResult.results.map((v) => {
          try {
            return {
              userId: v.user_id,
              rankings: JSON.parse(v.rankings || "[]"),
              timestamp: v.created_at,
            };
          } catch (parseError) {
            console.error("Error parsing vote rankings:", parseError);
            return {
              userId: v.user_id,
              rankings: [],
              timestamp: v.created_at,
            };
          }
        });
      }

      // Calculate results if not completed or no stored results, and manageable size
      if (
        (poll.phase !== "completed" || !poll.results) &&
        poll.votes.length < 100
      ) {
        try {
          poll.results = this.calculateResults(poll);
        } catch (resultError) {
          console.error("Error calculating results:", resultError);
          poll.results = null;
        }
      }

      return poll;
    } catch (error) {
      console.error("Error getting poll:", error);
      if (error.message === "Database timeout") {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    }
  }

  async getAllPolls(guildId) {
    try {
      const pollsResult = await this.db
        .prepare(
          `
                SELECT * FROM polls WHERE guild_id = ? ORDER BY created_at DESC LIMIT 20
            `,
        )
        .bind(guildId)
        .all();

      if (!pollsResult?.results) return [];

      // Return simplified poll list without full data to avoid timeouts
      return pollsResult.results.map((pollRow) => ({
        id: pollRow.id,
        title: pollRow.title,
        guildId: pollRow.guild_id,
        channelId: pollRow.channel_id,
        creatorId: pollRow.creator_id,
        phase: pollRow.phase,
        tallyMethod: pollRow.tally_method,
        nominationDeadline: pollRow.nomination_deadline,
        votingDeadline: pollRow.voting_deadline,
        createdAt: pollRow.created_at,
        updatedAt: pollRow.updated_at,
      }));
    } catch (error) {
      console.error("Error getting polls:", error);
      return [];
    }
  }

  async updatePoll(pollId, updates) {
    const now = new Date().toISOString();
    const setParts = [];
    const bindings = [];

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      const dbColumn = this.convertFieldToColumn(key);
      setParts.push(`${dbColumn} = ?`);

      if (key === "results") {
        bindings.push(JSON.stringify(value));
      } else {
        bindings.push(value);
      }
    }

    setParts.push("updated_at = ?");
    bindings.push(now);
    bindings.push(pollId);

    await this.db
      .prepare(
        `
            UPDATE polls SET ${setParts.join(", ")} WHERE id = ?
        `,
      )
      .bind(...bindings)
      .run();
  }

  convertFieldToColumn(field) {
    const fieldMap = {
      phase: "phase",
      results: "results_data",
      tallyMethod: "tally_method",
    };
    return fieldMap[field] || field;
  }

  async nominateBook(
    pollId,
    nomination,
    { isAdmin = false, isPollCreator = false } = {},
  ) {
    try {
      // Check poll exists and is in nomination phase
      const poll = await this.getPoll(pollId);
      if (!poll) {
        throw new Error("Poll not found");
      }

      if (poll.phase !== "nomination") {
        throw new Error("Poll is not in nomination phase");
      }

      // Check if user already nominated with detailed info
      const existingNomination = await this.db
        .prepare(
          `
                SELECT title, author FROM nominations WHERE poll_id = ? AND user_id = ?
            `,
        )
        .bind(pollId, nomination.userId)
        .first();

      if (existingNomination && !isAdmin && !isPollCreator) {
        throw new Error(
          `You have already nominated "${existingNomination.title}"${existingNomination.author ? ` by ${existingNomination.author}` : ""} for this poll`,
        );
      }

      // Insert nomination
      await this.db
        .prepare(
          `
                INSERT INTO nominations (poll_id, title, author, link, user_id, username)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
        )
        .bind(
          pollId,
          nomination.title,
          nomination.author || null,
          nomination.link || null,
          nomination.userId,
          nomination.username,
        )
        .run();

      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error nominating book:", error);
      throw error;
    }
  }

  async removeUserNomination(pollId, nominationId) {
    try {
      await this.db
        .prepare(
          `
                DELETE FROM nominations WHERE poll_id = ? AND id = ?
            `,
        )
        .bind(pollId, nominationId)
        .run();

      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error removing nomination:", error);
      throw error;
    }
  }

  /**
   * Edit a nomination's fields (title, author, link).
   * - Only admins or poll creators can edit any nomination.
   * - Regular users can only edit their own nominations.
   * @param {string} pollId
   * @param {object} fields - { nominationId, userId, title, author, link, isAdmin, isPollCreator }
   */
  async editNomination(pollId, { nominationId, userId, title, author, link, isAdmin = false, isPollCreator = false }) {
    try {
      // Get poll and nominations
      const poll = await this.getPoll(pollId);
      if (!poll) throw new Error("Poll not found");
      if (poll.phase !== "nomination") throw new Error("Can only edit nominations during nomination phase");

      // Find nomination
      let nomination;
      if (nominationId) {
        nomination = poll.nominations.find(n => n.id == nominationId);
        if (!nomination) throw new Error("Nomination not found");
      } else {
        // Find nominations by user
        const userNoms = poll.nominations.filter(n => n.userId === userId);
        if (userNoms.length === 0) throw new Error("You have no nominations to edit.");
        if (userNoms.length > 1 && !(isAdmin || isPollCreator)) {
          throw new Error("You have multiple nominations. Please specify nomination_id.");
        }
        nomination = userNoms.length === 1 ? userNoms[0] : null;
        if (!nomination) throw new Error("Nomination not found.");
      }

      // Permission check
      if (!(isAdmin || isPollCreator) && nomination.userId !== userId) {
        throw new Error("You can only edit your own nominations.");
      }

      // Build update query
      const updates = [];
      const bindings = [];
      if (title !== undefined) {
        updates.push("title = ?");
        bindings.push(title);
      }
      if (author !== undefined) {
        updates.push("author = ?");
        bindings.push(author);
      }
      if (link !== undefined) {
        updates.push("link = ?");
        bindings.push(link);
      }
      if (updates.length === 0) throw new Error("No fields to update.");

      bindings.push(pollId, nomination.id);

      await this.db
        .prepare(
          `
            UPDATE nominations
            SET ${updates.join(", ")}
            WHERE poll_id = ? AND id = ?
          `
        )
        .bind(...bindings)
        .run();

      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error editing nomination:", error);
      throw error;
    }
  }

  async submitVote(pollId, userId, rankings) {
    try {
      // Check if user already voted with direct query
      const existingVote = await this.db
        .prepare(
          `
                SELECT id FROM votes WHERE poll_id = ? AND user_id = ?
            `,
        )
        .bind(pollId, userId)
        .first();

      if (existingVote) {
        throw new Error("You have already voted in this poll");
      }

      // Insert vote
      await this.db
        .prepare(
          `
                INSERT INTO votes (poll_id, user_id, rankings)
                VALUES (?, ?, ?)
            `,
        )
        .bind(pollId, userId, JSON.stringify(rankings))
        .run();

      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error submitting vote:", error);
      throw error;
    }
  }

  async updatePollPhase(pollId, newPhase) {
    try {
      if (newPhase === "completed") {
        const poll = await this.getPoll(pollId);
        if (poll && poll.nominations.length > 0) {
          const results = this.calculateResults(poll);
          await this.updatePoll(pollId, { phase: newPhase, results });
        } else {
          await this.updatePoll(pollId, { phase: newPhase });
        }
      } else {
        await this.updatePoll(pollId, { phase: newPhase });
      }

      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error updating poll phase:", error);
      throw error;
    }
  }

  calculateResults(poll) {
    if (poll.tallyMethod === "chris-style") {
      return this.calculateChrisStyleResults(poll);
    } else {
      return this.calculateRankedChoiceResults(poll);
    }
  }

  calculateChrisStyleResults(poll) {
    try {
      return calculateChrisStyleWinner(poll.nominations, poll.votes);
    } catch (error) {
      console.error("Error calculating Chris-style results:", error);
      return { winner: null, standings: [], totalVotes: 0 };
    }
  }

  calculateRankedChoiceResults(poll) {
    try {
      return calculateRankedChoiceWinner(poll.nominations, poll.votes);
    } catch (error) {
      console.error("Error calculating ranked choice results:", error);
      return { winner: null, rounds: [], totalVotes: 0 };
    }
  }

  async checkIfAllVoted(pollId) {
    // Simplified check - just return the poll
    return await this.getPoll(pollId);
  }

  async getActivePolls() {
    try {
      const result = await this.db
        .prepare(
          `
                SELECT * FROM polls WHERE phase IN ('nomination', 'voting') ORDER BY created_at DESC LIMIT 10
            `,
        )
        .all();

      if (!result?.results) return [];

      return result.results.map((row) => ({
        id: row.id,
        title: row.title,
        guildId: row.guild_id,
        channelId: row.channel_id,
        phase: row.phase,
        nominationDeadline: row.nomination_deadline,
        votingDeadline: row.voting_deadline,
      }));
    } catch (error) {
      console.error("Error getting active polls:", error);
      return [];
    }
  }

  async getSingleActivePoll(guildId) {
    try {
      const result = await this.db
        .prepare(
          `
                SELECT id FROM polls WHERE guild_id = ? AND phase IN ('nomination', 'voting')
                ORDER BY created_at DESC LIMIT 1
            `,
        )
        .bind(guildId)
        .first();

      if (!result) return null;

      return await this.getPoll(result.id);
    } catch (error) {
      console.error("Error getting single active poll:", error);
      return null;
    }
  }

  async getVote(pollId, userId) {
    try {
      const result = await this.db
        .prepare(
          `
                SELECT * FROM votes WHERE poll_id = ? AND user_id = ?
            `,
        )
        .bind(pollId, userId)
        .first();

      if (!result) return null;

      return {
        pollId: result.poll_id,
        userId: result.user_id,
        optionId: result.option_id,
      };
    } catch (error) {
      console.error("Error getting vote:", error);
      return null;
    }
  }

  // Voting session management for chris-style voting
  async getVotingSession(userKey) {
    try {
      const result = await this.db
        .prepare(
          `
                SELECT * FROM voting_sessions WHERE user_key = ? AND expires_at > datetime('now')
            `,
        )
        .bind(userKey)
        .first();

      if (!result) return null;

      return {
        pollId: result.poll_id,
        userId: result.user_id,
        selections: JSON.parse(result.selections || "[]"),
      };
    } catch (error) {
      console.error("Error getting voting session:", error);
      return null;
    }
  }

  async setVotingSession(userKey, pollId, userId, selections) {
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      await this.db
        .prepare(
          `
                INSERT OR REPLACE INTO voting_sessions (user_key, poll_id, user_id, selections, expires_at)
                VALUES (?, ?, ?, ?, ?)
            `,
        )
        .bind(userKey, pollId, userId, JSON.stringify(selections), expiresAt)
        .run();
    } catch (error) {
      console.error("Error setting voting session:", error);
    }
  }

  async deleteVotingSession(userKey) {
    try {
      await this.db
        .prepare(
          `
                DELETE FROM voting_sessions WHERE user_key = ?
            `,
        )
        .bind(userKey)
        .run();
    } catch (error) {
      console.error("Error deleting voting session:", error);
    }
  }

  async deletePoll(pollId) {
    try {
      // Start transaction by deleting related data first
      await this.db
        .prepare(
          `
                DELETE FROM votes WHERE poll_id = ?
            `,
        )
        .bind(pollId)
        .run();

      await this.db
        .prepare(
          `
                DELETE FROM nominations WHERE poll_id = ?
            `,
        )
        .bind(pollId)
        .run();

      await this.db
        .prepare(
          `
                DELETE FROM voting_sessions WHERE poll_id = ?
            `,
        )
        .bind(pollId)
        .run();

      // Finally delete the poll itself
      const result = await this.db
        .prepare(
          `
                DELETE FROM polls WHERE id = ?
            `,
        )
        .bind(pollId)
        .run();

      return result.changes > 0;
    } catch (error) {
      console.error("Error deleting poll:", error);
      throw error;
    }
  }
}
