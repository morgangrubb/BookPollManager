const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { initializeFirebase } = require('./services/firebase');
const { startScheduler } = require('./services/scheduler');
const config = require('./config/config');

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const pollCommand = require('./commands/poll');
client.commands.set(pollCommand.data.name, pollCommand);

// Client ready event
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    
    // Initialize Firebase
    try {
        await initializeFirebase();
        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        process.exit(1);
    }
    
    // Start scheduler for poll phase transitions
    startScheduler();
    console.log('✅ Scheduler started');
    
    // Register slash commands
    await registerCommands();
});

// Interaction handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        const errorMessage = 'There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Register slash commands
async function registerCommands() {
    const commands = [];
    
    // Add poll command
    commands.push(pollCommand.data.toJSON());
    
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    
    try {
        console.log('Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(config.discord.clientId),
            { body: commands }
        );
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Start the bot
console.log('Attempting to login with token length:', config.discord.token?.length);
client.login(config.discord.token).catch(error => {
    console.error('Login failed:', error.message);
    if (error.code === 'TokenInvalid') {
        console.error('The Discord token appears to be invalid. Please check:');
        console.error('1. The token is from the correct bot application');
        console.error('2. The token hasn\'t been regenerated in Discord Developer Portal');
        console.error('3. The token has no extra spaces or characters');
    }
});
