// src/interactions/announce.js
import { createResponse } from "../utils/createResponse.js";
import { formatResults, formatStatus } from "../utils/format.js";

export const announceCommand = {
  name: "announce",
  description: "Announce the poll status to the channel",
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

export async function handlePollAnnounce({ poll }) {
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
    embeds: [embed],
  });
}
