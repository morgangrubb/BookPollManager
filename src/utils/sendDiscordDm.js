// Discord DM sending helper
// Discord requires two steps to send a DM:
//   1. POST /users/@me/channels to open (or retrieve) the DM channel with the user
//   2. POST /channels/:id/messages to send the message into that channel

import { sendDiscordMessage } from "./sendDiscordMessage.js";

/**
 * Send a direct message to a Discord user.
 *
 * @param {string} userId  - The target user's Discord snowflake ID
 * @param {object} content - Message payload (same shape as sendDiscordMessage: { content?, embeds?, components? })
 * @param {object} env     - Cloudflare Worker env (must have DISCORD_TOKEN)
 * @returns {Promise<object|null>} The sent message object, or null on failure
 */
export async function sendDiscordDm(userId, content, env) {
  if (!env.DISCORD_TOKEN) {
    console.error(
      "sendDiscordDm: DISCORD_TOKEN is not set. " +
        "Run `wrangler secret put DISCORD_TOKEN` to configure it.",
    );
    return null;
  }

  // Step 1: Open (or retrieve) the DM channel
  const dmChannelResponse = await fetch(
    "https://discord.com/api/v10/users/@me/channels",
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: userId }),
    },
  );

  if (!dmChannelResponse.ok) {
    const errorText = await dmChannelResponse.text();
    console.error(
      `sendDiscordDm: Failed to open DM channel for user=${userId} ` +
        `(${dmChannelResponse.status}): ${errorText}`,
    );
    return null;
  }

  const dmChannel = await dmChannelResponse.json();

  // Step 2: Send the message into the DM channel
  return sendDiscordMessage(dmChannel.id, content, env, { guildId: null });
}