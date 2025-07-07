// src/interactions/status.js
import { createResponse } from "../utils/createResponse.js";
import { formatResults, formatStatus } from "../utils/format.js";

export const statusCommand = {
  name: "status",
  description: "Check poll status",
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

export async function handlePollStatus({ poll }) {
  if (!poll) {
    return createResponse({
      ephemeral: true,
      content: "❌ Poll not found.",
    });
  }

  let embed;

  if (poll.phase === "completed") {
    embed = formatResults(poll);
  } else {
    embed = formatStatus(poll);
  }

  return createResponse({
    ephemeral: true,
    embeds: [embed],
  });
}
