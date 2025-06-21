// Discord message sending helper
export async function sendDiscordMessage(channelId, content, env) {
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  try {
    // Add small delay to help with rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord API error:", response.status, errorText);

      // Handle rate limiting gracefully
      if (response.status === 429) {
        console.warn("Discord API rate limit hit, skipping announcement");
        return null; // Don't throw error for rate limits
      }

      throw new Error(`Discord API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to send Discord message:", error);

    // Don't throw error for rate limiting issues
    if (error.message.includes("429")) {
      console.warn("Rate limit detected, skipping announcement");
      return null;
    }

    throw error;
  }
}
