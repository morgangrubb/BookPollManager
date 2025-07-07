// src/interactions/nominate.js
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";
import { formatNomination, formatStatus } from "../utils/format.js";

export const nominateCommand = {
  name: "nominate",
  description: "Nominate a book",
  type: 1, // SUB_COMMAND
  options: [
    {
      name: "title",
      description: "Book title",
      type: 3, // STRING
      required: true,
    },
    {
      name: "author",
      description: "Book author",
      type: 3, // STRING
      required: true,
    },
    {
      name: "link",
      description: "Link to book",
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

export async function handleNominate({
  interaction,
  options,
  pollManager,
  poll,
  userId,
  ...opts
}) {
  if (poll.phase !== "nomination") {
    return createResponse({
      ephemeral: true,
      content: "Poll is not in nomination phase",
    });
  }

  if (poll.nominations.some((nom) => nom.userId === userId)) {
    if (!opts.isAdmin && !opts.isPollCreator) {
      return createResponse({
        ephemeral: true,
        content: "You have already nominated a book.",
      });
    }
  }

  const title = getOptionValue(options, "title");
  const author = getOptionValue(options, "author");
  const link = getOptionValue(options, "link");

  // Validate required fields
  if (!title) {
    return createResponse({
      ephemeral: true,
      content: "Book title is required.",
    });
  }
  if (!link) {
    return createResponse({
      ephemeral: true,
      content: "Book link is required.",
    });
  }

  if (!title) {
    return createResponse({
      ephemeral: true,
      content: "Book title is required for nomination.",
    });
  }

  const nomination = {
    title,
    author,
    link,
    userId: interaction.member?.user?.id || interaction.user?.id,
    username: interaction.member?.user?.username || interaction.user?.username,
  };

  // Announce nomination to channel
  try {
    await pollManager.nominateBook(poll.id, nomination, opts);

    const updatedPoll = await pollManager.getPoll(poll.id);

    return createResponse({
      content: `\n\u200b\n\u200b📖 ${nomination.username} nominated ${formatNomination(nomination, { includeUser: false })}!\n\u200b`,
      embeds: [formatStatus(updatedPoll)],
    });
  } catch (error) {
    console.error("Failed to announce nomination:", error);
    console.error(error.stack);
    // Don't fail the nomination if announcement fails
  }

  return createResponse({
    ephemeral: true,
    content: `✅ Successfully nominated "${title}" ${author ? `by ${author}` : ""}!`, 
  });
}
