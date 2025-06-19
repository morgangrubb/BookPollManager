// Serverless Firebase service for Cloudflare Workers
let firestore = null;

export async function initializeFirebase(env) {
    if (firestore) return firestore;
    
    try {
        const projectId = env.X_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID;
        const serviceAccountKey = env.X_FIREBASE_SERVICE_ACCOUNT_KEY || env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        if (!projectId || !serviceAccountKey) {
            throw new Error('Firebase configuration missing');
        }
        
        // For Cloudflare Workers, we'll use Firebase REST API instead of admin SDK
        // Store config for REST API calls
        globalThis.firebaseConfig = {
            projectId,
            serviceAccount: JSON.parse(serviceAccountKey)
        };
        
        console.log('Firebase initialized for serverless environment');
        return true;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        throw error;
    }
}

export function getFirestore() {
    return globalThis.firebaseConfig;
}

// Firebase REST API helper functions
async function getAccessToken() {
    const serviceAccount = globalThis.firebaseConfig.serviceAccount;
    
    // Create JWT for Firebase Auth
    const header = {
        alg: 'RS256',
        typ: 'JWT'
    };
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };
    
    // Note: In production, you'd need to implement JWT signing with the private key
    // For simplicity, we'll use a different approach with service account key
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: await createJWT(header, payload, serviceAccount.private_key)
        })
    });
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
}

async function createJWT(header, payload, privateKey) {
    // Simplified JWT creation - in production you'd use proper crypto libraries
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = await signData(`${encodedHeader}.${encodedPayload}`, privateKey);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function signData(data, privateKey) {
    // Placeholder for actual signing - would need crypto implementation
    return btoa(data);
}

export async function firestoreRequest(method, path, data = null) {
    const projectId = globalThis.firebaseConfig.projectId;
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    try {
        const token = await getAccessToken();
        const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: data ? JSON.stringify(data) : null
        });
        
        if (!response.ok) {
            throw new Error(`Firestore request failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Firestore request error:', error);
        throw error;
    }
}