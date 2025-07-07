// src/interactions/withdraw-nomination.js
import { createResponse } from "../utils/createResponse.js";
import { sendDiscordMessage } from "../utils/sendDiscordMessage.js";

export const withdrawNominationCommand = {
  name: "withdraw-nomination",
  description: "Withdraw your nomination from the active poll",
  type: 1, // SUB_COMMAND
  options: [
    {
      name: "poll_id",
      description:
        "Poll ID (optional, will use most recent poll if not provided)",
      type: 3, // STRING
      required: false,
    },
  ],
};

export async function handleWithdrawNomination({
  interaction,
  pollManager,
  poll,
}) {
  const userId = interaction.member?.user?.id || interaction.user?.id;

  try {
    // Get nomination details before removal for announcement
    const userNominations = poll.nominations?.filter(
      (nom) => nom.userId === userId,
    );

    if (userNominations.length === 0) {
      return createResponse({
        ephemeral: true,
        content: "❌ You have no nominations to withdraw.",
      });
    }

    if (userNominations.length > 1) {
      return createResponse({
        ephemeral: true,
        content:
          "❌ You have multiple nominations to withdraw, use remove-nomination.",
      });
    }

    const userNomination = userNominations[0];

    await pollManager.removeUserNomination(poll.id, userNomination.id);

    // Announce withdrawal to channel
    if (userNomination && poll.channelId) {
      try {
        const announcementContent = `📖 **Nomination Withdrawn**\n\n**${userNomination.title}**${userNomination.author ? ` by ${userNomination.author}` : ""}\n\nWithdrawn by <@${userId}> from **${poll.title}**`;

        console.log(
          "Sending withdrawal announcement to channel:",
          poll.channelId,
        );
        await sendDiscordMessage(
          poll.channelId,
          announcementContent,
          pollManager.env,
        );
        console.log("Withdrawal announcement sent successfully");
      } catch (error) {
        console.error("Failed to announce withdrawal:", error);
      }
    }

    return createResponse({
      ephemeral: true,
      content: "✅ Your nomination has been withdrawn.",
    });
  } catch (error) {
    return createResponse({ ephemeral: true, content: `❌ ${error.message}` });
  }
}