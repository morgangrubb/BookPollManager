// Deploy-time command registration for Cloudflare Workers
// Reads commands from src/commands/poll.js and registers with Discord during deployment

const { pollCommand } = require("./commands/poll.js");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Optional for guild-specific commands

async function deployCommands() {
  if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error(
      "Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables",
    );
    process.exit(1);
  }

  // Extract command data from pollCommand structure
  const commands = [pollCommand.data];

  const url = GUILD_ID
    ? `https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`;

  try {
    console.log(
      "🚀 Deploying Discord slash commands during Worker deployment...",
    );

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Successfully deployed ${data.length} Discord commands`);
      console.log(`📋 Commands: ${data.map((cmd) => cmd.name).join(", ")}`);

      // Log subcommands for verification
      if (data[0]?.options) {
        const subcommands = data[0].options.map((opt) => opt.name);
        console.log(`🔧 Subcommands: ${subcommands.join(", ")}`);
      }
    } else {
      const error = await response.text();
      console.error(
        "❌ Failed to deploy Discord commands:",
        response.status,
        error,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Error during command deployment:", error);
    process.exit(1);
  }
}

// Only run if this file is executed directly (during deployment)
if (require?.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
