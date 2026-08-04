// src/interactions/test-oob.js
import { createResponse } from "../utils/createResponse.js";
import { sendDiscordMessage } from "../utils/sendDiscordMessage.js";
import { runInBackground } from "../utils/backgroundTask.js";

export const testOobCommand = {
  name: "test-oob",
  description: "Test out-of-band messaging by sending a message to the channel",
  type: 1, // SUB_COMMAND
};

export async function handleTestOob({ interaction, env, ctx }) {
  const channelId = interaction.channel_id;
  const guildId = interaction.guild_id;
  const userId = interaction.member?.user?.id || interaction.user?.id;

  // Register the OOB message as a background task so it runs after the
  // interaction response is sent, while still returning the ephemeral
  // reply immediately within Discord's 3-second deadline.
  runInBackground(
    ctx,
    sendDiscordMessage(
      channelId,
      {
        embeds: [
          {
            title: "✅ Out-of-Band Message Test",
            description:
              "This message was sent out-of-band (directly via the Discord REST API), " +
              "not as an interaction response. If you can see this, cron announcements " +
              "and other background messages are working correctly.",
            color: 0x57f287, // Discord green
            fields: [
              {
                name: "Channel",
                value: `<#${channelId}>`,
                inline: true,
              },
              {
                name: "Triggered by",
                value: `<@${userId}>`,
                inline: true,
              },
              {
                name: "Timestamp",
                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                inline: true,
              },
            ],
            footer: {
              text: "Sent via sendDiscordMessage()",
            },
          },
        ],
      },
      env,
      { guildId },
    ).catch((err) => {
      console.error("test-oob: OOB message failed:", err);
    }),
  );

  return createResponse({
    ephemeral: true,
    content:
      "🧪 OOB test triggered! An out-of-band message should appear in this channel shortly. " +
      "If it doesn't arrive within a few seconds, check the Worker logs for errors.",
  });
}
