require('dotenv').config();

module.exports = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID // Optional: for guild-specific commands
    },
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY // JSON string
    }
};
