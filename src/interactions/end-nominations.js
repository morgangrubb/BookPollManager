// src/interactions/end-nominations.js
import { createResponse } from "../utils/createResponse.js";

export const endNominationsCommand = {
  name: "end-nominations",
  description: "End nomination phase and start voting",
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

export async function handleEndNominations({
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  if (!isAdmin && !isPollCreator) {
    return createResponse({
      ephemeral: true,
      content: "Only admins or the poll creator can end the nomination phase.",
    });
  }

  if (poll.phase !== "nomination") {
    return createResponse({
      ephemeral: true,
      content: "This poll is not in the nomination phase.",
    });
  }

  try {
    await pollManager.updatePollPhase(poll.id, "voting");

    // Send voting phase announcement to the channel
    if (poll.channelId) {
      try {
        const updatedPoll = await pollManager.getPoll(poll.id);
        const { announceVotingPhase } = await import(
          "../services/scheduler.js"
        );
        await announceVotingPhase(updatedPoll, pollManager.env);
      } catch (error) {
        console.error("Failed to announce voting phase:", error);
      }
    }

    return createResponse({
      ephemeral: true,
      content: `✅ Nomination phase ended early for "${poll.title}". Voting phase has started!`,
    });
  } catch (error) {
    return createResponse({ ephemeral: true, content: `❌ ${error.message}` });
  }
}
