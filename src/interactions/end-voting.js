// src/interactions/end-voting.js
import { createResponse } from "../utils/createResponse.js";
import { formatResults } from "../utils/format.js";

export const endVotingCommand = {
  name: "end-voting",
  description: "End voting phase and show results",
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

export async function handleEndVoting({
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  if (!poll) {
    return createResponse({ ephemeral: true, content: "Poll not found." });
  }

  if (!isAdmin && !isPollCreator) {
    return createResponse({
      ephemeral: true,
      content: "Only the poll creator can end the voting phase.",
    });
  }

  if (poll.phase !== "voting") {
    return createResponse({
      ephemeral: true,
      content: "This poll is not in the voting phase.",
    });
  }

  try {
    await pollManager.updatePollPhase(poll.id, "completed");

    // Get updated poll data with votes
    const updatedPoll = await pollManager.getPoll(poll.id);
    const results = pollManager.calculateResults(updatedPoll);

    if (!results || (!results.winner && !results.tie)) {
      return createResponse({
        ephemeral: true,
        content: "❌ Unable to calculate results. No votes may have been cast.",
      });
    }

    const embed = formatResults(updatedPoll);

    // Send completion announcement to the channel
    if (poll.channelId) {
      try {
        const { announcePollCompletion } = await import(
          "../services/scheduler.js"
        );
        await announcePollCompletion(updatedPoll, pollManager.env);
      } catch (error) {
        console.error("Failed to announce poll completion:", error);
      }
    }

    return createResponse({
      embeds: [embed],
    });
  } catch (error) {
    console.error("Error ending voting:", error);
    return createResponse({
      ephemeral: true,
      content: `❌ Failed to end voting: ${error.message}`,
    });
  }
}
