// Serverless interaction handlers for Cloudflare Workers
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";
import { generateChrisStyleVotingInterface } from "../utils/chrisStyle.js";
import { generateRankedChoiceVotingInterface } from "../utils/rankedChoice.js";
import { sendDiscordMessage } from "../utils/sendDiscordMessage.js";
import {
  // formatNominations,
  formatNomination,
  // formatPollFields,
  formatPollFooterLine,
  formatResults,
  formatStatus,
} from "../utils/format.js";

export async function handleCreatePoll({ interaction, options, pollManager }) {
  const title = getOptionValue(options, "title");
  const nominationEnd = getOptionValue(options, "nomination_end");
  const votingEnd = getOptionValue(options, "voting_end");
  const tallyMethod =
    getOptionValue(options, "tally_method") || "ranked-choice";

  if (!title || !nominationEnd || !votingEnd) {
    return createResponse("Missing required parameters for poll creation.");
  }

  const nominationDeadline = new Date(nominationEnd);
  const votingDeadline = new Date(votingEnd);

  // Validate dates
  if (isNaN(nominationDeadline.getTime()) || isNaN(votingDeadline.getTime())) {
    return createResponse(
      "Invalid date format. Please use YYYY-MM-DD HH:MM format.",
    );
  }

  const now = new Date();
  if (nominationDeadline <= now) {
    return createResponse("Nomination deadline must be in the future.");
  }

  if (votingDeadline <= nominationDeadline) {
    return createResponse(
      "Voting deadline must be after the nomination deadline.",
    );
  }

  const pollData = {
    title,
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    creatorId: interaction.member?.user?.id || interaction.user?.id,
    tallyMethod,
    nominationEnd: nominationDeadline.toISOString(),
    votingEnd: votingDeadline.toISOString(),
  };

  const poll = await pollManager.createPoll(pollData);

  return new Response(
    JSON.stringify({
      type: 4,
      data: {
        embeds: [
          {
            title: "📚 New Book Poll Created!",
            description: `**${title}**\n\nNomination phase has started!`,
            fields: [
              {
                name: "📝 Nomination Deadline",
                value: `<t:${Math.floor(nominationDeadline.getTime() / 1000)}:F>`,
                inline: true,
              },
              {
                name: "🗳️ Voting Deadline",
                value: `<t:${Math.floor(votingDeadline.getTime() / 1000)}:F>`,
                inline: true,
              },
              {
                name: "📊 Tally Method",
                value:
                  tallyMethod === "chris-style"
                    ? "Chris Style (Top 3 Points)"
                    : "Ranked Choice (IRV)",
                inline: true,
              },
            ],
            color: 0x00ff00,
            footer: {
              text: formatPollFooterLine(poll),
            },
          },
        ],
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function handlePollStatus({ poll }) {
  if (!poll) {
    return createResponse("❌ Poll not found.");
  }

  let embed;

  if (poll.phase === "completed") {
    embed = formatResults(poll);
  } else {
    embed = formatStatus(poll);
  }

  return new Response(
    JSON.stringify({
      type: 4,
      data: { embeds: [embed] },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function handleNominate({
  interaction,
  options,
  pollManager,
  poll,
  userId,
  ...opts
}) {
  if (poll.phase !== "nomination") {
    createResponse("Poll is not in nomination phase");
  }

  if (poll.nominations.some((nom) => nom.userId === userId)) {
    if (!opts.isAdmin && !opts.isPollCreator) {
      return createResponse("You have already nominated a book.");
    }
  }

  const title = getOptionValue(options, "title");
  const author = getOptionValue(options, "author");
  const link = getOptionValue(options, "link");

  // Validate required fields
  if (!title) {
    return createResponse("Book title is required.");
  }
  if (!link) {
    return createResponse("Book link is required.");
  }

  if (!title) {
    return createResponse("Book title is required for nomination.");
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
    const channelId = poll.channelId || interaction.channel_id;

    await pollManager.nominateBook(poll.id, nomination, opts);

    if (channelId) {
      let announcementContent = `📚 **New Book Nomination!**\n\n${formatNomination(nomination)}\n\nFor **${poll.title}**`;

      console.log("Sending nomination announcement to channel:", channelId);
      await sendDiscordMessage(channelId, announcementContent, pollManager.env);
      console.log("Nomination announcement sent successfully");
    }
  } catch (error) {
    console.error("Failed to announce nomination:", error);
    // Don't fail the nomination if announcement fails
  }

  return createResponse(
    `✅ Successfully nominated "${title}" ${author ? `by ${author}` : ""}!`,
  );
}

export async function handleListPolls({ interaction, pollManager }) {
  const activePolls = await pollManager.getAllPolls(interaction.guild_id);

  if (activePolls.length === 0) {
    return createResponse("📚 No active polls found in this server.");
  }

  // Handle pagination for more than 10 polls
  const pollsPerPage = 10;
  const totalPages = Math.ceil(activePolls.length / pollsPerPage);
  const currentPolls = activePolls.slice(0, pollsPerPage);

  const pollList = currentPolls
    .map((poll) => {
      const createdTimestamp = poll.createdAt
        ? Math.floor(new Date(poll.createdAt).getTime() / 1000)
        : null;
      const timeDisplay =
        createdTimestamp && !isNaN(createdTimestamp)
          ? `<t:${createdTimestamp}:R>`
          : "Unknown date";
      const phase =
        poll.phase === "nomination"
          ? "📝 Nominating"
          : poll.phase === "voting"
            ? "🗳️ Voting"
            : "✅ Completed";

      return `\`${poll.id}\` - **${poll.title}** (${phase}) - ${timeDisplay}`;
    })
    .join("\n");

  const embed = {
    title: "📚 Book Club Polls",
    description: pollList,
    color: 0x0099ff,
    timestamp: new Date().toISOString(),
  };

  // Add pagination info if there are more polls
  if (totalPages > 1) {
    embed.footer = {
      text: `Showing 1-${currentPolls.length} of ${activePolls.length} polls (Page 1/${totalPages})`,
    };
  }

  return new Response(
    JSON.stringify({
      type: 4,
      data: {
        embeds: [embed],
        flags: 64,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

// Edit nomination handler for /poll edit-nomination
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
      return createResponse("❌ Nomination not found.");
    }
    nominationsToEdit = [nomination];
  } else {
    // Find nominations by user
    const userNoms = poll.nominations.filter((n) => n.userId === userId);
    if (userNoms.length === 0) {
      return createResponse("❌ You have no nominations to edit.");
    }
    if (userNoms.length > 1 && !(isAdmin || isPollCreator)) {
      return createResponse(
        "❌ You have multiple nominations. Please specify nomination_id.",
      );
    }
    nominationsToEdit = userNoms.length === 1 ? [userNoms[0]] : userNoms;
  }

  // Permission check
  for (const nomination of nominationsToEdit) {
    if (!(isAdmin || isPollCreator) && nomination.userId !== userId) {
      return createResponse("❌ You can only edit your own nominations.");
    }
  }

  // Only one nomination should be edited at a time
  if (nominationsToEdit.length > 1) {
    return createResponse(
      "❌ Multiple nominations found. Please specify nomination_id.",
    );
  }

  const nomination = nominationsToEdit[0];

  // Validate at least one field to update
  if (!newTitle && !newAuthor && !newLink) {
    return createResponse(
      "Please specify at least one field to update (title, author, or link).",
    );
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

    return createResponse("✅ Nomination updated successfully.");
  } catch (error) {
    return createResponse(`❌ Failed to update nomination: ${error.message}`);
  }
}

// Tie-break handler for /poll tie-break
export async function handleTieBreak({
  interaction,
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  if (
    !poll ||
    poll.phase !== "completed" ||
    poll.tallyMethod !== "chris-style"
  ) {
    return createResponse(
      "❌ Tie-break is only available for completed Chris-style polls.",
    );
  }
  if (
    !poll.results ||
    poll.results.tie !== true ||
    !Array.isArray(poll.results.tiedNominations) ||
    poll.results.tiedNominations.length < 2
  ) {
    return createResponse("❌ There is no tie to break for this poll.");
  }
  if (!(isAdmin || isPollCreator)) {
    return createResponse(
      "❌ Only the poll creator or a server admin can break a tie.",
    );
  }

  const winnerNominationId = interaction.data?.values?.[0];
  if (!winnerNominationId) {
    // Show options for tie-break
    const tiedOptions = poll.results.tiedNominations.map((nom) => ({
      label: nom.title + (nom.author ? ` by ${nom.author}` : ""),
      value: String(nom.id),
      description: nom.link || undefined,
    }));

    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "Select the winner from the tied nominations below.",
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: `tie_break_${poll.id}`,
                  options: tiedOptions,
                  placeholder: "Select winner",
                  min_values: 1,
                  max_values: 1,
                },
              ],
            },
          ],
          flags: 64,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Find the selected winner
  const winnerNom = poll.results.tiedNominations.find(
    (nom) => String(nom.id) === String(winnerNominationId),
  );
  if (!winnerNom) {
    return createResponse(
      "❌ Selected winner is not among the tied nominations.",
    );
  }

  // Update poll results in DB
  try {
    // Overwrite winner in results and remove tie
    const newResults = {
      ...poll.results,
      winner: winnerNom,
      tie: false,
      tiedNominations: [],
    };
    await pollManager.updatePoll(poll.id, {
      results: newResults,
    });
    const updatedPoll = await pollManager.getPoll(poll.id);

    // Announce to channel
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          embeds: [
            formatResults(updatedPoll, { heading: "Tie broken by Dottie" }),
          ],
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return createResponse(`❌ Failed to resolve tie: ${error.message}`);
  }
}

export async function handleWithdrawNomination({
  interaction,
  pollManager,
  poll,
}) {
  const userId = interaction.member?.user?.id || interaction.user?.id;

  try {
    // Get nomination details before removal for announcement
    const userNominations = poll.nominations?.filter(
      (nom) => nom.userId === userId,
    );

    if (userNominations.length === 0) {
      return createResponse("❌ You have no nominations to withdraw.");
    }

    if (userNominations.length > 1) {
      return createResponse(
        "❌ You have multiple nominations to withdraw, use remove-nomination.",
      );
    }

    const userNomination = userNominations[0];

    await pollManager.removeUserNomination(poll.id, userNomination.id);

    // Announce withdrawal to channel
    if (userNomination && poll.channelId) {
      try {
        const announcementContent = `📖 **Nomination Withdrawn**\n\n**${userNomination.title}**${userNomination.author ? ` by ${userNomination.author}` : ""}\n\nWithdrawn by <@${userId}> from **${poll.title}**`;

        console.log(
          "Sending withdrawal announcement to channel:",
          poll.channelId,
        );
        await sendDiscordMessage(
          poll.channelId,
          announcementContent,
          pollManager.env,
        );
        console.log("Withdrawal announcement sent successfully");
      } catch (error) {
        console.error("Failed to announce withdrawal:", error);
      }
    }

    return createResponse("✅ Your nomination has been withdrawn.");
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handleVote({ interaction, poll, userId }) {
  if (poll.phase !== "voting") {
    return createResponse("This poll is not in the voting phase.");
  }

  // Check if user already voted
  const existingVote = (poll.votes || []).some(
    (vote) => vote.userId === userId,
  );

  if (existingVote) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "You have already voted in this poll!",
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Generate voting interface based on tally method
  if (poll.tallyMethod === "chris-style") {
    return generateChrisStyleVotingInterface(
      poll,
      interaction.member?.user?.id || interaction.user?.id,
    );
  } else {
    return generateRankedChoiceVotingInterface(poll);
  }
}

export async function handleRemoveNomination({
  options,
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  const nominationId = getOptionValue(options, "nomination_id");

  if (!nominationId) {
    return createResponse("Nomination ID is required.");
  }

  try {
    if (!poll) {
      return createResponse("Poll not found.");
    }

    if (!isAdmin && !isPollCreator) {
      return createResponse(
        "Only server admins or the poll creator can remove nominations.",
      );
    }

    const nominationIndex = parseInt(nominationId) - 1;
    if (
      isNaN(nominationIndex) ||
      nominationIndex < 0 ||
      !poll.nominations ||
      nominationIndex >= poll.nominations.length
    ) {
      return createResponse("Invalid nomination ID.");
    }

    const nomination = poll.nominations[nominationIndex];

    await pollManager.removeUserNomination(poll.id, nomination.id);

    return createResponse(
      `✅ Removed nomination: "${nomination.title}" ${nomination.author ? `by ${nomination.author}` : ""}`,
    );
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handleEndNominations({
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  if (!isAdmin && !isPollCreator) {
    return createResponse(
      "Only admins or the poll creator can end the nomination phase.",
    );
  }

  if (poll.phase !== "nomination") {
    return createResponse("This poll is not in the nomination phase.");
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

    return createResponse(
      `✅ Nomination phase ended early for "${poll.title}". Voting phase has started!`,
    );
  } catch (error) {
    return createResponse(`❌ ${error.message}`);
  }
}

export async function handleEndVoting({
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  if (!poll) {
    return createResponse("Poll not found.");
  }

  if (!isAdmin && !isPollCreator) {
    return createResponse("Only the poll creator can end the voting phase.");
  }

  if (poll.phase !== "voting") {
    return createResponse("This poll is not in the voting phase.");
  }

  try {
    await pollManager.updatePollPhase(poll.id, "completed");

    // Get updated poll data with votes
    const updatedPoll = await pollManager.getPoll(poll.id);
    const results = pollManager.calculateResults(updatedPoll);

    if (!results || (!results.winner && !results.tie)) {
      return createResponse(
        "❌ Unable to calculate results. No votes may have been cast.",
      );
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

    return new Response(
      JSON.stringify({
        type: 4,
        data: { embeds: [embed] },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error ending voting:", error);
    return createResponse(`❌ Failed to end voting: ${error.message}`);
  }
}

export async function handleDeletePoll({
  interaction,
  options,
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  const guildId = interaction.guild_id || interaction.guildId;
  const userId = interaction?.member?.user?.id || interaction?.user?.id;

  if (!userId) {
    return createResponse("❌ Unable to identify user.", true);
  }

  const pollId = getOptionValue(options, "poll_id");
  const confirmText = getOptionValue(options, "confirm");

  if (!pollId) {
    return createResponse("❌ Poll ID is required.", true);
  }

  if (!poll || poll.guildId !== guildId) {
    return createResponse("❌ Poll could not be found.", true);
  }

  if (confirmText !== "DELETE") {
    return createResponse(
      '❌ To confirm deletion, you must type "DELETE" exactly.',
      true,
    );
  }

  if (!isAdmin && !isPollCreator) {
    return createResponse(
      "❌ Only the poll creator or server administrators can delete polls.",
      true,
    );
  }

  try {
    const deleted = await pollManager.deletePoll(pollId);

    if (!deleted) {
      return createResponse(
        "❌ Failed to delete poll. It may have already been deleted.",
        true,
      );
    }

    // Send deletion announcement to the channel
    if (poll.channelId) {
      try {
        await sendDiscordMessage(
          poll.channelId,
          {
            embeds: [
              {
                title: "🗑️ Poll Deleted",
                description: `**${poll.title}** has been deleted by <@${userId}>.`,
                color: 0xff0000,
                footer: { text: `Poll ID: ${pollId}` },
                timestamp: new Date().toISOString(),
              },
            ],
          },
          pollManager.env,
        );
      } catch (error) {
        console.error("Failed to send deletion announcement:", error);
      }
    }

    return createResponse(
      `✅ Poll "${poll.title}" has been successfully deleted.`,
      true,
    );
  } catch (error) {
    console.error("Error deleting poll:", error);
    return createResponse(
      "❌ An error occurred while deleting the poll. Please try again.",
      true,
    );
  }
}
