const { Client, GatewayIntentBits } = require('discord.js');

const token = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot connected successfully as ${client.user.tag}`);
    console.log(`Bot ID: ${client.user.id}`);
    console.log(`Guilds: ${client.guilds.cache.size}`);
    process.exit(0);
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

console.log('Testing Discord connection...');
client.login(token).catch(error => {
    console.error('❌ Login failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'TokenInvalid') {
        console.error('\nPossible causes:');
        console.error('- Token was copied incorrectly');
        console.error('- Token was regenerated after being provided');
        console.error('- Bot application was deleted or disabled');
        console.error('- Token lacks necessary permissions');
    }
    
    process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.error('❌ Connection timeout - bot may not have proper permissions');
    process.exit(1);
}, 10000);