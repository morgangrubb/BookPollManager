// src/interactions/status.js
import { createResponse } from "../utils/createResponse.js";
import { formatResults, formatStatus } from "../utils/format.js";
import { calculateChrisStyleWinner } from "../utils/chrisStyle.js";

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
    {
      name: "nominations",
      description:
        "Show nominations with index numbers for commands like add-vote",
      type: 5, // BOOLEAN
      required: false,
    },
  ],
};

export async function handlePollStatus({ poll, options }) {
  if (!poll) {
    return createResponse({
      ephemeral: true,
      content: "❌ Poll not found.",
    });
  }

  // Check if nominations flag is set
  const showNominations =
    options?.find((opt) => opt.name === "nominations")?.value || false;

  console.log({ showNominations });

  let embed;

  if (poll.phase === "completed") {
    embed = formatResults(poll, { showIndexedNominations: showNominations });
  } else {
    console.log(
      JSON.stringify(
        calculateChrisStyleWinner(poll.nominations || [], poll.votes || []),
        null,
        2,
      ),
    );

    embed = formatStatus(poll, { showIndexedNominations: showNominations });
  }

  return createResponse({
    ephemeral: true,
    embeds: [embed],
  });
}
