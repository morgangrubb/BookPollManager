const { getFirestore } = require('./firebase');
const { calculateRankedChoiceWinner } = require('../utils/rankedChoice');

class PollManager {
    constructor() {
        this.db = null;
    }
    
    getDB() {
        if (!this.db) {
            this.db = getFirestore();
        }
        return this.db;
    }
    
    async createPoll(pollData) {
        const db = this.getDB();
        
        const poll = {
            ...pollData,
            id: this.generatePollId(),
            phase: 'nomination', // nomination, voting, completed
            nominations: [],
            votes: [],
            results: null,
            createdAt: new Date(),
            nominationEnd: pollData.nominationEnd,
            votingEnd: pollData.votingEnd,
            tallyMethod: pollData.tallyMethod || 'ranked-choice'
        };
        
        await db.collection('polls').doc(poll.id).set(poll);
        return poll.id;
    }
    
    async getPoll(pollId) {
        const db = this.getDB();
        
        const doc = await db.collection('polls').doc(pollId).get();
        if (!doc.exists) {
            return null;
        }
        
        const data = doc.data();
        return {
            ...data,
            nominationEnd: data.nominationEnd.toDate(),
            votingEnd: data.votingEnd.toDate(),
            createdAt: data.createdAt.toDate()
        };
    }
    
    async getAllPolls(guildId) {
        const db = this.getDB();
        
        const snapshot = await db.collection('polls')
            .where('guildId', '==', guildId)
            .get();
        
        const polls = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            nominationEnd: doc.data().nominationEnd.toDate(),
            votingEnd: doc.data().votingEnd.toDate(),
            createdAt: doc.data().createdAt.toDate()
        }));
        
        // Sort by creation date descending in JavaScript instead of Firestore
        return polls.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    async nominateBook(pollId, nomination) {
        const db = this.getDB();
        const pollRef = db.collection('polls').doc(pollId);
        
        const poll = await this.getPoll(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        
        if (poll.phase !== 'nomination') {
            throw new Error(`Cannot nominate books during ${poll.phase} phase`);
        }
        
        if (new Date() > poll.nominationEnd) {
            throw new Error('Nomination period has ended');
        }
        
        // Check if user already nominated
        const existingNomination = poll.nominations.find(n => n.nominatedBy === nomination.nominatedBy);
        if (existingNomination) {
            throw new Error('You have already nominated a book for this poll. Use the remove command to delete your current nomination first.');
        }
        
        // Check if book already nominated
        const duplicateBook = poll.nominations.find(n => 
            n.title.toLowerCase() === nomination.title.toLowerCase() || 
            n.link === nomination.link
        );
        if (duplicateBook) {
            throw new Error('This book has already been nominated');
        }
        
        await pollRef.update({
            nominations: [...poll.nominations, nomination]
        });
    }
    
    async removeUserNomination(pollId, userId) {
        const db = this.getDB();
        const pollRef = db.collection('polls').doc(pollId);
        
        const poll = await this.getPoll(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        
        if (poll.phase !== 'nomination') {
            throw new Error('Cannot remove nominations during voting or after poll completion');
        }
        
        const userNominationIndex = poll.nominations.findIndex(n => n.nominatedBy === userId);
        if (userNominationIndex === -1) {
            throw new Error('You have not nominated any book in this poll');
        }
        
        const updatedNominations = poll.nominations.filter((_, index) => index !== userNominationIndex);
        
        await pollRef.update({
            nominations: updatedNominations
        });
        
        return poll.nominations[userNominationIndex];
    }
    
    async submitVote(pollId, userId, rankings) {
        const db = this.getDB();
        const pollRef = db.collection('polls').doc(pollId);
        
        const poll = await this.getPoll(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        
        if (poll.phase !== 'voting') {
            throw new Error(`Cannot vote during ${poll.phase} phase`);
        }
        
        if (new Date() > poll.votingEnd) {
            throw new Error('Voting period has ended');
        }
        
        // Check if user already voted
        const existingVote = poll.votes.find(v => v.userId === userId);
        if (existingVote) {
            throw new Error('You have already voted in this poll');
        }
        
        const vote = {
            userId,
            rankings,
            submittedAt: new Date()
        };
        
        await pollRef.update({
            votes: [...poll.votes, vote]
        });
    }
    
    async updatePollPhase(pollId, newPhase) {
        const db = this.getDB();
        const pollRef = db.collection('polls').doc(pollId);
        
        await pollRef.update({
            phase: newPhase,
            phaseUpdatedAt: new Date()
        });
    }
    
    async completePoll(pollId) {
        const poll = await this.getPoll(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        
        if (poll.votes.length === 0) {
            await this.updatePollPhase(pollId, 'completed');
            return;
        }
        
        // Calculate results based on tally method
        let results;
        if (poll.tallyMethod === 'chris-style') {
            const { calculateChrisStyleWinner } = require('../utils/chrisStyle');
            results = calculateChrisStyleWinner(poll.nominations, poll.votes);
        } else {
            results = calculateRankedChoiceWinner(poll.nominations, poll.votes);
        }
        
        const db = this.getDB();
        const pollRef = db.collection('polls').doc(pollId);
        
        await pollRef.update({
            phase: 'completed',
            results,
            completedAt: new Date()
        });
        
        return results;
    }
    
    async getActivePolls() {
        const db = this.getDB();
        
        const snapshot = await db.collection('polls')
            .where('phase', 'in', ['nomination', 'voting'])
            .get();
        
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            nominationEnd: doc.data().nominationEnd.toDate(),
            votingEnd: doc.data().votingEnd.toDate(),
            createdAt: doc.data().createdAt.toDate()
        }));
    }
    
    async getSingleActivePoll(guildId) {
        const activePolls = await this.getActivePolls();
        const guildActivePolls = activePolls.filter(poll => poll.guildId === guildId);
        
        // Prioritize polls that haven't ended yet
        const now = new Date();
        const trulyActivePolls = guildActivePolls.filter(poll => 
            (poll.phase === 'nomination' && now <= poll.nominationEnd) ||
            (poll.phase === 'voting' && now <= poll.votingEnd)
        );
        
        if (trulyActivePolls.length === 1) {
            return trulyActivePolls[0];
        }
        
        // If no truly active polls, return null (requires manual poll ID)
        return null;
    }
    
    async removeNomination(pollId, nominationIndex) {
        const db = this.getDB();
        const pollRef = db.collection('polls').doc(pollId);
        
        const poll = await this.getPoll(pollId);
        if (!poll) {
            throw new Error('Poll not found');
        }
        
        if (poll.phase === 'completed') {
            throw new Error('Cannot modify completed polls');
        }
        
        if (poll.phase === 'voting') {
            throw new Error('Cannot remove nominations during voting period');
        }
        
        if (nominationIndex < 0 || nominationIndex >= poll.nominations.length) {
            throw new Error('Invalid nomination index');
        }
        
        const updatedNominations = poll.nominations.filter((_, index) => index !== nominationIndex);
        
        await pollRef.update({
            nominations: updatedNominations
        });
    }
    
    async checkIfAllVoted(pollId) {
        const poll = await this.getPoll(pollId);
        if (!poll || poll.phase !== 'voting') {
            return false;
        }
        
        // Get unique voters
        const uniqueVoters = new Set(poll.votes.map(vote => vote.userId));
        
        // For now, we'll use a simple heuristic: if we have more than 3 votes
        // and haven't had a new vote in the last check, consider ending early
        // In a real implementation, you'd want to track guild member count
        return uniqueVoters.size >= 3 && poll.nominations.length > 0;
    }

    generatePollId() {
        return Math.random().toString(36).substr(2, 9).toUpperCase();
    }
}

const pollManager = new PollManager();

module.exports = {
    createPoll: (pollData) => pollManager.createPoll(pollData),
    getPoll: (pollId) => pollManager.getPoll(pollId),
    getAllPolls: (guildId) => pollManager.getAllPolls(guildId),
    nominateBook: (pollId, nomination) => pollManager.nominateBook(pollId, nomination),
    submitVote: (pollId, userId, rankings) => pollManager.submitVote(pollId, userId, rankings),
    updatePollPhase: (pollId, newPhase) => pollManager.updatePollPhase(pollId, newPhase),
    completePoll: (pollId) => pollManager.completePoll(pollId),
    getActivePolls: () => pollManager.getActivePolls(),
    getSingleActivePoll: (guildId) => pollManager.getSingleActivePoll(guildId),
    removeNomination: (pollId, nominationIndex) => pollManager.removeNomination(pollId, nominationIndex),
    removeUserNomination: (pollId, userId) => pollManager.removeUserNomination(pollId, userId),
    checkIfAllVoted: (pollId) => pollManager.checkIfAllVoted(pollId)
};
