const { calculateRankedChoiceWinner } = require('../utils/rankedChoice');

class PollManager {
    constructor() {
        this.db = null;
    }
    
    getDB() {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async createPoll(pollData) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async getPoll(pollId) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async getAllPolls(guildId) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async nominateBook(pollId, nomination) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async removeUserNomination(pollId, userId) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async submitVote(pollId, userId, rankings) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async updatePollPhase(pollId, newPhase) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async completePoll(pollId) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async getActivePolls() {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async getSingleActivePoll(guildId) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async removeNomination(pollId, nominationIndex) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    async checkIfAllVoted(pollId) {
        throw new Error('Firebase integration removed - please use serverless version with D1 database');
    }
    
    generatePollId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
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