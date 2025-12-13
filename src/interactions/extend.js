// src/interactions/extend.js
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";

export const extendCommand = {
  name: "extend",
  description:
    "Extend the current poll phase by a number of days (use force=true for completed polls)",
  type: 1, // SUB_COMMAND
  options: [
    {
      name: "days",
      description: "Number of days to extend (default: 1, max: 14)",
      type: 4, // INTEGER
      required: false,
      min_value: 1,
      max_value: 14,
    },
    {
      name: "poll_id",
      description:
        "Poll ID (optional, will use most recent poll if not provided)",
      type: 3, // STRING
      required: false,
    },
    {
      name: "force",
      description: "Force extension of completed poll (reopens to voting)",
      type: 5, // BOOLEAN
      required: false,
    },
  ],
};

export async function handlePollExtend({
  interaction,
  options,
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  if (!isAdmin && !isPollCreator) {
    return createResponse({
      ephemeral: true,
      content: "Only admins or the poll creator can extend a poll.",
    });
  }

  // Check if poll is completed and force is not set
  const force = getOptionValue(options, "force") || false;
  if (poll.phase === "completed" && !force) {
    return createResponse({
      ephemeral: true,
      content:
        "Cannot extend a completed poll. Use `force: true` to reopen the poll and extend the voting phase.",
    });
  }

  // Get days parameter, default to 1
  let days = getOptionValue(options, "days");
  if (!days) {
    days = 1;
  }

  // Validate days range
  if (days < 1 || days > 14) {
    return createResponse({
      ephemeral: true,
      content: "Days must be between 1 and 14.",
    });
  }

  const millisecondsToAdd = days * 24 * 60 * 60 * 1000;

  try {
    const updates = {};

    if (poll.phase === "nomination") {
      // Extend both nomination and voting deadlines
      const currentNominationEnd = new Date(poll.nominationDeadline);
      const currentVotingEnd = new Date(poll.votingDeadline);

      const newNominationEnd = new Date(
        currentNominationEnd.getTime() + millisecondsToAdd,
      );
      const newVotingEnd = new Date(
        currentVotingEnd.getTime() + millisecondsToAdd,
      );

      updates.nominationDeadline = newNominationEnd.toISOString();
      updates.votingDeadline = newVotingEnd.toISOString();

      await pollManager.updatePoll(poll.id, updates);

      return createResponse({
        ephemeral: false,
        content:
          `✅ Poll "${poll.title}" has been extended by ${days} day${days === 1 ? "" : "s"}.\n\n` +
          `📝 New nomination deadline: <t:${Math.floor(newNominationEnd.getTime() / 1000)}:F>\n` +
          `🗳️ New voting deadline: <t:${Math.floor(newVotingEnd.getTime() / 1000)}:F>`,
      });
    } else if (poll.phase === "voting" || poll.phase === "completed") {
      // Extend only voting deadline
      const currentVotingEnd = new Date(poll.votingDeadline);
      const newVotingEnd = new Date(
        currentVotingEnd.getTime() + millisecondsToAdd,
      );

      updates.votingDeadline = newVotingEnd.toISOString();

      // Clear results_data if it exists
      if (poll.results) {
        updates.results = null;
      }

      // If poll was completed, return to voting phase
      if (poll.phase === "completed") {
        updates.phase = "voting";
      }

      await pollManager.updatePoll(poll.id, updates);

      const message =
        poll.phase === "completed"
          ? `✅ Poll "${poll.title}" has been reopened and extended by ${days} day${days === 1 ? "" : "s"}.\n\n` +
            `📝 Phase: Voting (reopened)\n` +
            `🗳️ New voting deadline: <t:${Math.floor(newVotingEnd.getTime() / 1000)}:F>`
          : `✅ Poll "${poll.title}" voting phase has been extended by ${days} day${days === 1 ? "" : "s"}.\n\n` +
            `🗳️ New voting deadline: <t:${Math.floor(newVotingEnd.getTime() / 1000)}:F>`;

      return createResponse({
        ephemeral: false,
        content: message,
      });
    }
  } catch (error) {
    console.error("Error extending poll:", error);
    return createResponse({
      ephemeral: true,
      content: `❌ Failed to extend poll: ${error.message}`,
    });
  }
}
