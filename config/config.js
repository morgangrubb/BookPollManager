require('dotenv').config();

module.exports = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID // Optional: for guild-specific commands
    },
    // Firebase configuration removed - using serverless D1 database
};
