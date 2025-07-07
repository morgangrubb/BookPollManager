// src/interactions/remove-nomination.js
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";

export const removeNominationCommand = {
  name: "remove-nomination",
  description: "Remove a nomination",
  type: 1, // SUB_COMMAND
  options: [
    {
      name: "nomination_id",
      description: "Nomination ID to remove",
      type: 3, // STRING
      required: true,
    },
    {
      name: "poll_id",
      description:
        "Poll ID (optional, will use most recent poll if not provided)",
      type: 3, // STRING
      required: false,
    },
  ],
};

export async function handleRemoveNomination({
  options,
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  const nominationId = getOptionValue(options, "nomination_id");

  if (!nominationId) {
    return createResponse({
      ephemeral: true,
      content: "Nomination ID is required.",
    });
  }

  try {
    if (!poll) {
      return createResponse({ ephemeral: true, content: "Poll not found." });
    }

    if (!isAdmin && !isPollCreator) {
      return createResponse({
        ephemeral: true,
        content:
          "Only server admins or the poll creator can remove nominations.",
      });
    }

    const nominationIndex = parseInt(nominationId) - 1;
    if (
      isNaN(nominationIndex) ||
      nominationIndex < 0 ||
      !poll.nominations ||
      nominationIndex >= poll.nominations.length
    ) {
      return createResponse({
        ephemeral: true,
        content: "Invalid nomination ID.",
      });
    }

    const nomination = poll.nominations[nominationIndex];

    await pollManager.removeUserNomination(poll.id, nomination.id);

    return createResponse({
      ephemeral: true,
      content: `✅ Removed nomination: "${nomination.title}" ${nomination.author ? `by ${nomination.author}` : ""}`,
    });
  } catch (error) {
    return createResponse({ ephemeral: true, content: `❌ ${error.message}` });
  }
}
