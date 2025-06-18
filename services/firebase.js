const admin = require('firebase-admin');
const config = require('../config/config');

let db;

async function initializeFirebase() {
    try {
        // Initialize Firebase Admin SDK
        if (!admin.apps.length) {
            const serviceAccount = JSON.parse(config.firebase.serviceAccountKey);
            
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: config.firebase.projectId
            });
        }
        
        db = admin.firestore();
        console.log('Firebase initialized successfully');
        
        return db;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        throw error;
    }
}

function getFirestore() {
    if (!db) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return db;
}

module.exports = {
    initializeFirebase,
    getFirestore,
    admin
};
