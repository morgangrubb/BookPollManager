#!/usr/bin/env node

// Test script to verify Discord bot can send messages to a channel
// Usage: node test-discord-permissions.js <channelId> [guildId]

import { config } from 'dotenv';
import { sendDiscordMessage } from './src/utils/sendDiscordMessage.js';

// Load environment variables from .env file
config();

async function testDiscordPermissions() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Usage: node test-discord-permissions.js <channelId> [guildId]');
    console.log('');
    console.log('Examples:');
    console.log('  node test-discord-permissions.js 1381742190992293989');
    console.log('  node test-discord-permissions.js 1381742190992293989 123456789012345678');
    console.log('');
    console.log('💡 Tip: You can get the channel ID by enabling Developer Mode in Discord,');
    console.log('   then right-clicking on the channel and selecting "Copy ID"');
    process.exit(1);
  }

  const channelId = args[0];
  const guildId = args[1] || process.env.DISCORD_GUILD_ID;

  // Validate required environment variables
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is not set in .env file');
    process.exit(1);
  }

  // Create mock environment object (similar to Cloudflare Workers env)
  const env = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID: guildId
  };

  console.log('🧪 Testing Discord Bot Permissions');
  console.log('=================================');
  console.log(`📍 Channel ID: ${channelId}`);
  if (guildId) {
    console.log(`🏠 Guild ID: ${guildId}`);
  }
  console.log(`🤖 Bot Token: ${env.DISCORD_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  try {
    const testMessage = `🧪 **Permission Test**

This is a test message from the Book Poll Bot to verify permissions.

**Test Details:**
- Channel ID: \`${channelId}\`
- Timestamp: ${new Date().toISOString()}
- Test Type: Send Message Permission

If you can see this message, the bot has proper permissions! ✅`;

    console.log('📤 Sending test message...');
    
    const result = await sendDiscordMessage(channelId, testMessage, env);
    
    if (result) {
      console.log('✅ SUCCESS: Test message sent successfully!');
      console.log(`📨 Message ID: ${result.id}`);
      console.log('');
      console.log('✨ The bot has proper permissions to send messages to this channel.');
      console.log('   The nomination announcement issue should be resolved.');
    } else {
      console.log('⚠️  Test completed but no response received (possible rate limit)');
    }

  } catch (error) {
    console.error('❌ FAILED: Could not send test message');
    console.error('');
    
    if (error.message.includes('403')) {
      console.error('🚫 Permission Error (403):');
      console.error('   The bot does not have permission to send messages in this channel.');
      console.error('');
      console.error('🔧 To fix this:');
      console.error('   1. Check the bot\'s role permissions in the server');
      console.error('   2. Ensure the bot has "Send Messages" permission');
      console.error('   3. Check channel-specific permission overrides');
      console.error('   4. Re-invite the bot with proper permissions if needed');
    } else if (error.message.includes('404')) {
      console.error('🔍 Not Found Error (404):');
      console.error('   The channel was not found. This could mean:');
      console.error('   - The channel ID is incorrect');
      console.error('   - The bot is not in the server that contains this channel');
      console.error('   - The channel has been deleted');
    } else if (error.message.includes('401')) {
      console.error('🔐 Authentication Error (401):');
      console.error('   The bot token is invalid or expired.');
      console.error('   Please check your DISCORD_TOKEN in the .env file.');
    } else {
      console.error('🐛 Unexpected Error:');
      console.error(`   ${error.message}`);
    }
    
    console.error('');
    console.error('💡 For more help:');
    console.error('   - Check Discord Developer Portal for your bot\'s permissions');
    console.error('   - Verify the bot is in the correct server');
    console.error('   - Make sure Developer Mode is enabled to get correct IDs');
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

// Run the test
testDiscordPermissions();
