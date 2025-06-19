// Firebase integration removed - serverless version uses D1 database
// This file is kept for backwards compatibility but is no longer functional

function initializeFirebase() {
    console.log('⚠️  Firebase integration removed - please use serverless version with D1 database');
    return Promise.resolve();
}

function getFirestore() {
    throw new Error('Firebase integration removed - please use serverless version with D1 database');
}

module.exports = {
    initializeFirebase,
    getFirestore
};