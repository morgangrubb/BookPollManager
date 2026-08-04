// Discord message sending helper
export async function sendDiscordMessage(channelId, content, env, { guildId } = {}) {
  if (!env.DISCORD_TOKEN) {
    console.error(
      "sendDiscordMessage: DISCORD_TOKEN is not set. " +
      "Run `wrangler secret put DISCORD_TOKEN` to configure it."
    );
    return null;
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  const versionNumber = "1.0.0";
  const context = guildId
    ? `guild=${guildId} channel=${channelId}`
    : `channel=${channelId}`;

  try {
    // Add small delay to help with rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": `DiscordBot (https://discord.com/api, ${versionNumber})`,
      },
      body: JSON.stringify(content),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 429) {
        console.warn(`sendDiscordMessage: Rate limited [${context}], skipping announcement`);
        return null;
      }

      if (response.status === 403) {
        console.error(
          `sendDiscordMessage: 403 Forbidden [${context}]. ` +
          "The bot is likely not a member of this guild. " +
          "Re-invite the bot using the /invite link with both `bot` and `applications.commands` scopes. " +
          `Discord error: ${errorText}`
        );
        return null;
      }

      if (response.status === 404) {
        console.error(
          `sendDiscordMessage: 404 Not Found [${context}]. ` +
          "The channel does not exist or the bot cannot see it. " +
          `Discord error: ${errorText}`
        );
        return null;
      }

      console.error(
        `sendDiscordMessage: Discord API error ${response.status} [${context}]: ${errorText}`
      );
      throw new Error(`Discord API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message?.includes("429")) {
      console.warn(`sendDiscordMessage: Rate limit detected [${context}], skipping announcement`);
      return null;
    }

    console.error(`sendDiscordMessage: Failed to send message [${context}]:`, error);
    throw error;
  }
}
