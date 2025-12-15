// src/interactions/add-vote.js
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";

export const addVoteCommand = {
  name: "add-vote",
  description: "Add a vote on behalf of someone else (admin/creator only)",
  type: 1, // SUB_COMMAND
  options: [
    {
      name: "username",
      description: "Name of the person voting",
      type: 3, // STRING
      required: true,
    },
    {
      name: "rankings",
      description: "Comma-separated nomination numbers (e.g., '1,3,2' for chris-style or '2,1,3,4' for ranked-choice)",
      type: 3, // STRING
      required: true,
    },
    {
      name: "poll_id",
      description: "Poll ID (optional, will use most recent poll if not provided)",
      type: 3, // STRING
      required: false,
    },
    {
      name: "force",
      description: "Force adding vote to completed poll (recalculates results)",
      type: 5, // BOOLEAN
      required: false,
    },
  ],
};

export async function handleAddVote({
  interaction,
  options,
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  // Permission check
  if (!isAdmin && !isPollCreator) {
    return createResponse({
      ephemeral: true,
      content: "Only admins or the poll creator can add votes on behalf of others.",
    });
  }

  // Get parameters
  const username = getOptionValue(options, "username");
  const rankingsInput = getOptionValue(options, "rankings");
  const force = getOptionValue(options, "force") || false;

  if (!username || !rankingsInput) {
    return createResponse({
      ephemeral: true,
      content: "Missing required parameters: username and rankings.",
    });
  }

  // Check phase
  if (poll.phase === "nomination") {
    return createResponse({
      ephemeral: true,
      content: "Cannot add votes during the nomination phase. Wait for voting to start.",
    });
  }

  if (poll.phase === "completed" && !force) {
    return createResponse({
      ephemeral: true,
      content: "Cannot add votes to a completed poll. Use `force: true` to reopen and recalculate results.",
    });
  }

  // Validate nominations exist
  if (!poll.nominations || poll.nominations.length === 0) {
    return createResponse({
      ephemeral: true,
      content: "❌ No nominations available to vote for.",
    });
  }

  // Parse rankings
  const rankingNumbers = rankingsInput.split(",").map((r) => r.trim());

  // Validate based on tally method
  if (poll.tallyMethod === "chris-style") {
    // Chris-style requires exactly 3 picks
    if (rankingNumbers.length !== 3) {
      return createResponse({
        ephemeral: true,
        content: `❌ Chris-style voting requires exactly 3 picks. You provided ${rankingNumbers.length}.`,
      });
    }
  } else if (poll.tallyMethod === "ranked-choice") {
    // Ranked-choice requires all nominations to be ranked
    if (rankingNumbers.length !== poll.nominations.length) {
      return createResponse({
        ephemeral: true,
        content: `❌ Ranked-choice voting requires ranking all ${poll.nominations.length} nominations. You provided ${rankingNumbers.length}.`,
      });
    }
  }

  // Convert to 0-based indices and validate
  const rankings = [];
  for (const numStr of rankingNumbers) {
    const num = parseInt(numStr, 10);
    if (isNaN(num) || num < 1 || num > poll.nominations.length) {
      return createResponse({
        ephemeral: true,
        content: `❌ Invalid nomination number: ${numStr}. Must be between 1 and ${poll.nominations.length}.`,
      });
    }
    rankings.push(num - 1); // Convert to 0-based index
  }

  // Check for duplicates
  const uniqueRankings = new Set(rankings);
  if (uniqueRankings.size !== rankings.length) {
    return createResponse({
      ephemeral: true,
      content: "❌ Cannot vote for the same nomination multiple times.",
    });
  }

  // Use username as userId for manual votes (prefix with "manual_" to distinguish)
  const manualUserId = `manual_${username}`;

  try {
    // Check if this username already voted
    const existingVote = (poll.votes || []).some(
      (vote) => vote.userId === manualUserId,
    );

    if (existingVote) {
      return createResponse({
        ephemeral: true,
        content: `❌ A vote for "${username}" has already been recorded in this poll.`,
      });
    }

    // If poll was completed, set it back to voting phase
    if (poll.phase === "completed") {
      await pollManager.updatePoll(poll.id, {
        phase: "voting",
        results: null,
      });
    }

    // Submit the vote
    await pollManager.submitVote(poll.id, manualUserId, rankings);

    // Get updated poll
    const updatedPoll = await pollManager.getPoll(poll.id);

    // Build response message
    const nominationsList = rankings
      .map((idx, rank) => {
        const nom = poll.nominations[idx];
        const position = poll.tallyMethod === "chris-style"
          ? ["1st", "2nd", "3rd"][rank]
          : `#${rank + 1}`;
        return `${position}: ${nom.title}${nom.author ? ` by ${nom.author}` : ""}`;
      })
      .join("\n");

    const message = poll.phase === "completed"
      ? `✅ Vote added for "${username}" and poll reopened for recalculation.\n\n**Rankings:**\n${nominationsList}\n\n**Total Votes:** ${updatedPoll.votes.length}`
      : `✅ Vote successfully added for "${username}".\n\n**Rankings:**\n${nominationsList}\n\n**Total Votes:** ${updatedPoll.votes.length}`;

    return createResponse({
      ephemeral: false,
      content: message,
    });
  } catch (error) {
    console.error("Error adding vote:", error);
    return createResponse({
      ephemeral: true,
      content: `❌ Failed to add vote: ${error.message}`,
    });
  }
}
