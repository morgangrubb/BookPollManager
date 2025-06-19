// Serverless Poll Manager for Cloudflare Workers with D1 Database
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
        
        await this.db.prepare(`
            INSERT INTO polls (
                id, title, guild_id, channel_id, creator_id, 
                phase, tally_method, nomination_deadline, voting_deadline, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            pollId,
            pollData.title,
            pollData.guildId,
            pollData.channelId,
            pollData.creatorId,
            'nomination',
            pollData.tallyMethod || 'ranked-choice',
            pollData.nominationDeadline,
            pollData.votingDeadline,
            now,
            now
        ).run();

        return await this.getPoll(pollId);
    }

    async getPoll(pollId) {
        try {
            // Get poll data
            const pollResult = await this.db.prepare(`
                SELECT * FROM polls WHERE id = ?
            `).bind(pollId).first();
            
            if (!pollResult) {
                return null;
            }
            
            // Get nominations
            const nominations = await this.db.prepare(`
                SELECT * FROM nominations WHERE poll_id = ? ORDER BY created_at ASC
            `).bind(pollId).all();
            
            // Get votes
            const votes = await this.db.prepare(`
                SELECT * FROM votes WHERE poll_id = ?
            `).bind(pollId).all();
            
            // Combine data
            const poll = {
                id: pollResult.id,
                title: pollResult.title,
                guildId: pollResult.guild_id,
                channelId: pollResult.channel_id,
                creatorId: pollResult.creator_id,
                phase: pollResult.phase,
                tallyMethod: pollResult.tally_method,
                nominationDeadline: pollResult.nomination_deadline,
                votingDeadline: pollResult.voting_deadline,
                createdAt: pollResult.created_at,
                updatedAt: pollResult.updated_at,
                nominations: nominations.results?.map(n => ({
                    title: n.title,
                    author: n.author,
                    link: n.link,
                    userId: n.user_id,
                    username: n.username,
                    timestamp: n.created_at
                })) || [],
                votes: votes.results?.map(v => ({
                    userId: v.user_id,
                    rankings: JSON.parse(v.rankings),
                    timestamp: v.created_at
                })) || [],
                results: pollResult.results_data ? JSON.parse(pollResult.results_data) : null
            };
            
            return poll;
        } catch (error) {
            console.error('Error getting poll:', error);
            return null;
        }
    }

    async getAllPolls(guildId) {
        try {
            const polls = await this.db.prepare(`
                SELECT * FROM polls WHERE guild_id = ? ORDER BY created_at DESC
            `).bind(guildId).all();
            
            if (!polls.results) return [];
            
            // Get nominations and votes for each poll
            const pollsWithData = await Promise.all(
                polls.results.map(async (pollRow) => {
                    const nominations = await this.db.prepare(`
                        SELECT * FROM nominations WHERE poll_id = ? ORDER BY created_at ASC
                    `).bind(pollRow.id).all();
                    
                    const votes = await this.db.prepare(`
                        SELECT * FROM votes WHERE poll_id = ?
                    `).bind(pollRow.id).all();
                    
                    return {
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
                        nominations: nominations.results?.map(n => ({
                            title: n.title,
                            author: n.author,
                            link: n.link,
                            userId: n.user_id,
                            username: n.username,
                            timestamp: n.created_at
                        })) || [],
                        votes: votes.results?.map(v => ({
                            userId: v.user_id,
                            rankings: JSON.parse(v.rankings),
                            timestamp: v.created_at
                        })) || [],
                        results: pollRow.results_data ? JSON.parse(pollRow.results_data) : null
                    };
                })
            );
            
            return pollsWithData;
        } catch (error) {
            console.error('Error getting polls:', error);
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
            
            if (key === 'results') {
                bindings.push(JSON.stringify(value));
            } else {
                bindings.push(value);
            }
        }
        
        setParts.push('updated_at = ?');
        bindings.push(now);
        bindings.push(pollId);
        
        await this.db.prepare(`
            UPDATE polls SET ${setParts.join(', ')} WHERE id = ?
        `).bind(...bindings).run();
    }
    
    convertFieldToColumn(field) {
        const fieldMap = {
            'phase': 'phase',
            'results': 'results_data',
            'tallyMethod': 'tally_method'
        };
        return fieldMap[field] || field;
    }

    async nominateBook(pollId, nomination) {
        const poll = await this.getPoll(pollId);
        if (!poll) throw new Error('Poll not found');

        // Check if user already nominated
        const existingNomination = poll.nominations.find(n => n.userId === nomination.userId);
        if (existingNomination) {
            throw new Error('You have already nominated a book for this poll');
        }

        // Insert nomination into database
        await this.db.prepare(`
            INSERT INTO nominations (poll_id, title, author, link, user_id, username)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            pollId,
            nomination.title,
            nomination.author || null,
            nomination.link || null,
            nomination.userId,
            nomination.username
        ).run();

        return await this.getPoll(pollId);
    }

    async removeUserNomination(pollId, userId) {
        const poll = await this.getPoll(pollId);
        if (!poll) throw new Error('Poll not found');

        // Remove nomination from database
        await this.db.prepare(`
            DELETE FROM nominations WHERE poll_id = ? AND user_id = ?
        `).bind(pollId, userId).run();

        return await this.getPoll(pollId);
    }

    async submitVote(pollId, userId, rankings) {
        const poll = await this.getPoll(pollId);
        if (!poll) throw new Error('Poll not found');

        if (poll.phase !== 'voting') {
            throw new Error('Poll is not in voting phase');
        }

        // Check if user already voted
        const existingVote = poll.votes.find(v => v.userId === userId);
        if (existingVote) {
            throw new Error('You have already voted in this poll');
        }

        // Insert vote into database
        await this.db.prepare(`
            INSERT INTO votes (poll_id, user_id, rankings)
            VALUES (?, ?, ?)
        `).bind(pollId, userId, JSON.stringify(rankings)).run();

        // Check if all members have voted
        await this.checkIfAllVoted(pollId);
        
        return await this.getPoll(pollId);
    }

    async updatePollPhase(pollId, newPhase) {
        const poll = await this.getPoll(pollId);
        if (!poll) throw new Error('Poll not found');

        poll.phase = newPhase;
        
        if (newPhase === 'completed') {
            // Calculate results
            const results = this.calculateResults(poll);
            poll.results = results;
            await this.updatePoll(pollId, { phase: newPhase, results });
        } else {
            await this.updatePoll(pollId, { phase: newPhase });
        }

        return poll;
    }

    calculateResults(poll) {
        if (poll.tallyMethod === 'chris-style') {
            return this.calculateChrisStyleResults(poll);
        } else {
            return this.calculateRankedChoiceResults(poll);
        }
    }

    calculateChrisStyleResults(poll) {
        const scores = {};
        poll.nominations.forEach((nomination, index) => {
            scores[index] = { nomination, points: 0 };
        });

        poll.votes.forEach(vote => {
            vote.rankings.forEach((bookIndex, position) => {
                const points = Math.max(0, 3 - position);
                scores[bookIndex - 1].points += points;
            });
        });

        const sortedResults = Object.values(scores)
            .sort((a, b) => b.points - a.points);

        return {
            winner: sortedResults[0]?.nomination || null,
            standings: sortedResults,
            totalVotes: poll.votes.length
        };
    }

    calculateRankedChoiceResults(poll) {
        // Simplified ranked choice - full implementation would require IRV algorithm
        const firstChoices = {};
        poll.nominations.forEach((nomination, index) => {
            firstChoices[index] = { nomination, votes: 0 };
        });

        poll.votes.forEach(vote => {
            if (vote.rankings.length > 0) {
                firstChoices[vote.rankings[0] - 1].votes++;
            }
        });

        const sortedResults = Object.values(firstChoices)
            .sort((a, b) => b.votes - a.votes);

        return {
            winner: sortedResults[0]?.nomination || null,
            standings: sortedResults,
            totalVotes: poll.votes.length
        };
    }

    async checkIfAllVoted(pollId) {
        // In serverless, we can't fetch guild members directly
        // This would need to be handled differently or removed
        return false;
    }

    async getActivePolls() {
        try {
            const polls = await this.db.prepare(`
                SELECT * FROM polls WHERE phase != 'completed' ORDER BY created_at DESC
            `).all();
            
            if (!polls.results) return [];
            
            // Get nominations and votes for each poll
            const pollsWithData = await Promise.all(
                polls.results.map(async (pollRow) => {
                    const nominations = await this.db.prepare(`
                        SELECT * FROM nominations WHERE poll_id = ? ORDER BY created_at ASC
                    `).bind(pollRow.id).all();
                    
                    const votes = await this.db.prepare(`
                        SELECT * FROM votes WHERE poll_id = ?
                    `).bind(pollRow.id).all();
                    
                    return {
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
                        nominations: nominations.results?.map(n => ({
                            title: n.title,
                            author: n.author,
                            link: n.link,
                            userId: n.user_id,
                            username: n.username,
                            timestamp: n.created_at
                        })) || [],
                        votes: votes.results?.map(v => ({
                            userId: v.user_id,
                            rankings: JSON.parse(v.rankings),
                            timestamp: v.created_at
                        })) || [],
                        results: pollRow.results_data ? JSON.parse(pollRow.results_data) : null
                    };
                })
            );
            
            return pollsWithData;
        } catch (error) {
            console.error('Error getting active polls:', error);
            return [];
        }
    }

    async getSingleActivePoll(guildId) {
        const activePolls = await this.getActivePolls();
        const guildPolls = activePolls.filter(poll => poll.guildId === guildId);
        return guildPolls.length === 1 ? guildPolls[0] : null;
    }

    // D1 Database helper methods for voting sessions
    async getVotingSession(userKey) {
        try {
            const session = await this.db.prepare(`
                SELECT * FROM voting_sessions WHERE user_key = ? AND expires_at > datetime('now')
            `).bind(userKey).first();
            
            if (!session) return null;
            
            return {
                pollId: session.poll_id,
                userId: session.user_id,
                selections: JSON.parse(session.selections),
                createdAt: session.created_at,
                expiresAt: session.expires_at
            };
        } catch (error) {
            console.error('Error getting voting session:', error);
            return null;
        }
    }
    
    async setVotingSession(userKey, pollId, userId, selections) {
        try {
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
            
            await this.db.prepare(`
                INSERT OR REPLACE INTO voting_sessions 
                (user_key, poll_id, user_id, selections, expires_at)
                VALUES (?, ?, ?, ?, ?)
            `).bind(
                userKey,
                pollId,
                userId,
                JSON.stringify(selections),
                expiresAt
            ).run();
            
            return true;
        } catch (error) {
            console.error('Error setting voting session:', error);
            return false;
        }
    }
    
    async deleteVotingSession(userKey) {
        try {
            await this.db.prepare(`
                DELETE FROM voting_sessions WHERE user_key = ?
            `).bind(userKey).run();
            
            return true;
        } catch (error) {
            console.error('Error deleting voting session:', error);
            return false;
        }
    }
}