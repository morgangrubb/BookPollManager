require('dotenv').config();

module.exports = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID // Optional: for guild-specific commands
    },
    firebase: {
        projectId: process.env.X_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        serviceAccountKey: process.env.X_FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY // JSON string
    }
};
