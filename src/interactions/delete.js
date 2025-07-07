// src/interactions/delete.js
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";
import { sendDiscordMessage } from "../utils/sendDiscordMessage.js";

export const deletePollCommand = {
  name: "delete",
  description: "Delete a poll",
  type: 1,
  options: [
    {
      name: "poll_id",
      description: "Poll ID to delete",
      type: 3,
      required: true,
    },
    {
      name: "confirm",
      description: 'Type "DELETE" to confirm deletion',
      type: 3,
      required: true,
    },
  ],
};

export async function handleDeletePoll({
  interaction,
  options,
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  const guildId = interaction.guild_id || interaction.guildId;
  const userId = interaction?.member?.user?.id || interaction?.user?.id;

  if (!userId) {
    return createResponse({
      ephemeral: true,
      content: "❌ Unable to identify user.",
    });
  }

  const pollId = getOptionValue(options, "poll_id");
  const confirmText = getOptionValue(options, "confirm");

  if (!pollId) {
    return createResponse({
      ephemeral: true,
      content: "❌ Poll ID is required.",
    });
  }

  if (!poll || poll.guildId !== guildId) {
    return createResponse({
      ephemeral: true,
      content: "❌ Poll could not be found.",
    });
  }

  if (confirmText !== "DELETE") {
    return createResponse({
      ephemeral: true,
      content: '❌ To confirm deletion, you must type "DELETE" exactly.',
    });
  }

  if (!isAdmin && !isPollCreator) {
    return createResponse({
      ephemeral: true,
      content:
        "❌ Only the poll creator or server administrators can delete polls.",
    });
  }

  try {
    const deleted = await pollManager.deletePoll(pollId);

    if (!deleted) {
      return createResponse({
        ephemeral: true,
        content: "❌ Failed to delete poll. It may have already been deleted.",
      });
    }

    // Send deletion announcement to the channel
    if (poll.channelId) {
      try {
        await sendDiscordMessage(
          poll.channelId,
          {
            embeds: [
              {
                title: "🗑️ Poll Deleted",
                description: `**${poll.title}** has been deleted by <@${userId}>.`,
                color: 0xff0000,
                footer: { text: `Poll ID: ${pollId}` },
                timestamp: new Date().toISOString(),
              },
            ],
          },
          pollManager.env,
        );
      } catch (error) {
        console.error("Failed to send deletion announcement:", error);
      }
    }

    return createResponse({
      ephemeral: true,
      content: `✅ Poll "${poll.title}" has been successfully deleted.`,
    });
  } catch (error) {
    console.error("Error deleting poll:", error);
    return createResponse({
      ephemeral: true,
      content:
        "❌ An error occurred while deleting the poll. Please try again.",
    });
  }
}
