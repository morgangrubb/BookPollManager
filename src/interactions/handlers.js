// Serverless interaction handlers for Cloudflare Workers
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";
import { generateChrisStyleVotingInterface } from "../utils/chrisStyle.js";
import { generateRankedChoiceVotingInterface } from "../utils/rankedChoice.js";
import { sendDiscordMessage } from "../utils/sendDiscordMessage.js";

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

  const embed = {
    title: `📚 ${poll.title}`,
    color:
      poll.phase === "completed"
        ? 0x00ff00
        : poll.phase === "voting"
          ? 0xffaa00
          : 0x0099ff,
    fields: [
      {
        name: "📝 Phase",
        value: poll.phase.charAt(0).toUpperCase() + poll.phase.slice(1),
        inline: true,
      },
      {
        name: "📊 Tally Method",
        value:
          poll.tallyMethod === "chris-style" ? "Chris Style" : "Ranked Choice",
        inline: true,
      },
    ],
    footer: { text: formatPollFooterLine(poll) },
    timestamp: new Date().toISOString(),
  };

  if (poll.phase === "completed" || poll.phase === "voting") {
    embed.fields.push({
      name: "🗳️ Votes Cast",
      value: poll.results.totalVotes.toString(),
      inline: true,
    });

    if (poll.phase === "completed" && poll.results.winner) {
      embed.fields.push({
        name: "🏆 Winner",
        value: formatNomination(poll.results.winner),
        inline: false,
      });
    }
  }

  if (poll.nominations && poll.nominations.length > 0) {
    embed.fields.push({
      name: "📖 Nominations",
      value: formatNominations(poll),
      inline: false,
    });
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

function formatNomination(nomination) {
  if (!nomination) return "Invalid nomination";
  return `[${nomination.title} ${nomination.author ? `by ${nomination.author}` : ""}](${nomination.link}) (${nomination.username})`;
}

function formatPollFooterLine(poll) {
  // return `Poll ID: ${poll.id}, ${poll.creatorId ? `Created by <@${poll.creatorId}>` : null}`;
  return `Poll ID: ${poll.id}`;
}

function formatNominations(poll) {
  let nominationsList = "";

  if (poll.nominations && poll.nominations.length > 0) {
    // If poll is completed, show nominations sorted by final score
    if (
      poll.phase === "completed" &&
      poll.results &&
      Array.isArray(poll.results.standings)
    ) {
      // Each result in poll.results.standings should have at least: title, author, username, score
      const sorted = [...poll.results.standings].sort(
        (a, b) => (b.points ?? 0) - (a.points ?? 0),
      );
      nominationsList = sorted
        .map(
          (standing, idx) =>
            `${idx + 1}. ${formatNomination(standing.nomination)} — **${standing.points ?? 0}** point${standing.points === 1 ? "" : "s"}`,
        )
        .join("\n");
    } else {
      // Show in nomination order
      nominationsList = poll.nominations
        .map((nom, idx) => `${idx + 1}. ${formatNomination(nom)}`)
        .join("\n");
    }
  }

  return nominationsList;
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

  console.log(userId);
  console.log(JSON.stringify(poll.votes, null, 2));

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
        const { announceVotingPhase } = await import("./services/scheduler.js");
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

    if (!results || !results.winner) {
      return createResponse(
        "❌ Unable to calculate results. No votes may have been cast.",
      );
    }

    const embed = {
      title: `🏆 ${poll.title} - Results`,
      description: `**Winner:** ${results.winner.title}${results.winner.author ? ` by ${results.winner.author}` : ""}`,
      color: 0x00ff00,
      fields: [
        {
          name: "📊 Final Results",
          value: formatNominations(updatedPoll),
          inline: false,
        },
      ],
      footer: { text: `Poll ID: ${poll.id}` },
    };

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
