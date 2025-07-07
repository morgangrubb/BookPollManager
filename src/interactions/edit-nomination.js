// src/interactions/edit-nomination.js
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";

export const editNominationCommand = {
  name: "edit-nomination",
  description: "Edit a nomination",
  type: 1, // SUB_COMMAND
  options: [
    {
      name: "title",
      description: "New book title",
      type: 3, // STRING
      required: false,
    },
    {
      name: "author",
      description: "New book author",
      type: 3, // STRING
      required: false,
    },
    {
      name: "link",
      description: "New link to book",
      type: 3, // STRING
      required: false,
    },
    {
      name: "poll_id",
      description:
        "Poll ID (optional, will use most recent poll if not provided)",
      type: 3, // STRING
      required: false,
    },
    {
      name: "nomination_id",
      description:
        "Nomination ID (optional, required if you have multiple nominations)",
      type: 3, // STRING
      required: false,
    },
  ],
};

export async function handleEditNomination({
  interaction,
  options,
  pollManager,
  poll,
  userId,
  isAdmin,
  isPollCreator,
}) {
  // Get editable fields
  const newTitle = getOptionValue(options, "title");
  const newAuthor = getOptionValue(options, "author");
  const newLink = getOptionValue(options, "link");
  const nominationIdOpt = getOptionValue(options, "nomination_id");

  // Find nominations to edit
  let nominationsToEdit = [];

  if (nominationIdOpt) {
    // Find by nomination_id
    const nomination = poll.nominations[nominationIdOpt - 1];
    if (!nomination) {
      return createResponse({
        ephemeral: true,
        content: "❌ Nomination not found.",
      });
    }
    nominationsToEdit = [nomination];
  } else {
    // Find nominations by user
    const userNoms = poll.nominations.filter((n) => n.userId === userId);
    if (userNoms.length === 0) {
      return createResponse({
        ephemeral: true,
        content: "❌ You have no nominations to edit.",
      });
    }
    if (userNoms.length > 1 && !(isAdmin || isPollCreator)) {
      return createResponse({
        ephemeral: true,
        content:
          "❌ You have multiple nominations. Please specify nomination_id.",
      });
    }
    nominationsToEdit = userNoms.length === 1 ? [userNoms[0]] : userNoms;
  }

  // Permission check
  for (const nomination of nominationsToEdit) {
    if (!(isAdmin || isPollCreator) && nomination.userId !== userId) {
      return createResponse({
        ephemeral: true,
        content: "❌ You can only edit your own nominations.",
      });
    }
  }

  // Only one nomination should be edited at a time
  if (nominationsToEdit.length > 1) {
    return createResponse({
      ephemeral: true,
      content: "❌ Multiple nominations found. Please specify nomination_id.",
    });
  }

  const nomination = nominationsToEdit[0];

  // Validate at least one field to update
  if (!newTitle && !newAuthor && !newLink) {
    return createResponse({
      ephemeral: true,
      content:
        "Please specify at least one field to update (title, author, or link).",
    });
  }

  // Update nomination in DB
  try {
    await pollManager.editNomination(poll.id, {
      nominationId: nomination.id,
      userId,
      title: newTitle,
      author: newAuthor,
      link: newLink,
      isAdmin,
      isPollCreator,
    });

    return createResponse({
      ephemeral: true,
      content: "✅ Nomination updated successfully.",
    });
  } catch (error) {
    return createResponse({
      ephemeral: true,
      content: `❌ Failed to update nomination: ${error.message}`,
    });
  }
}
