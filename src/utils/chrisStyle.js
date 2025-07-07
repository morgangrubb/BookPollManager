import { InteractionResponseType } from "discord-interactions";
import { sendDiscordMessage } from "./sendDiscordMessage.js";
import { formatNomination, formatPollFields, formatStatus } from "./format.js";
import { createResponse } from "./createResponse.js";

/**
 * Implements Chris-style voting where users pick exactly 3 books
 * First place gets 3 points, second gets 2 points, third gets 1 point
 * @param {Array} candidates - Array of nomination objects
 * @param {Array} votes - Array of vote objects with rankings
 * @returns {Object} Results object with winner and final scores
 */
export function calculateChrisStyleWinner(candidates, votes) {
  const scores = {};

  // Initialize scores for all candidates
  candidates.forEach((candidate) => {
    scores[candidate.id] = {
      nomination: candidate,
      points: 0,
    };
  });

  // Calculate points from votes
  votes.forEach((vote) => {
    vote.rankings.forEach((nominationId, position) => {
      if (scores[nominationId]) {
        // Award points: 3 for first, 2 for second, 1 for third
        const points = Math.max(0, 3 - position);
        scores[nominationId].points += points;
      }
    });
  });

  // Sort candidates by points (highest first)
  const sortedResults = Object.values(scores).sort(
    (a, b) => b.points - a.points,
  );

  // Handle tie for first place: announce tie, no winner, provide tied nominations
  let winner = null;
  let tie = false;
  let tiedNominations = [];
  if (sortedResults.length > 0) {
    const topPoints = sortedResults[0].points;
    const tied = sortedResults.filter((r) => r.points === topPoints);
    if (tied.length === 1) {
      winner = tied[0].nomination;
      tie = false;
      tiedNominations = [];
    } else {
      // Tie detected, no winner, return tied nominations for Dottie to resolve
      tie = true;
      tiedNominations = tied.map((r) => r.nomination);
      winner = null;
    }
  }

  return {
    winner,
    standings: sortedResults,
    totalVotes: votes.length,
    tie, // boolean: true if tie, false otherwise
    tiedNominations, // array of tied nominations if tie, otherwise []
  };
}

// /**
//  * Format chris-style results for display
//  * @param {Object} results - Results from calculateChrisStyleWinner
//  * @returns {String} Formatted results string
//  */
// export function formatChrisStyleResults(results) {
//   if (!results.winner) {
//     return "No winner determined.";
//   }

//   let output = `Chris-Style Winner: ${results.winner.title}\n\n`;
//   output += "Final Standings:\n";

//   results.standings.forEach((result, index) => {
//     const position =
//       index === 0
//         ? "🥇"
//         : index === 1
//           ? "🥈"
//           : index === 2
//             ? "🥉"
//             : `${index + 1}.`;
//     output += `${position} ${result.nomination.title} - ${result.points} points\n`;
//   });

//   return output;
// }

export async function handleChrisStyleVoting(interaction, env, pollManager) {
  const customId = interaction.data.custom_id;
  const parts = customId.split("_");
  const position = parts[2]; // first, second, third
  const pollId = parts[3];
  const selectedValue = interaction.data.values[0];
  const userId = interaction.member?.user?.id || interaction.user?.id;

  // Get or create voting session
  const userKey = `${userId}_${pollId}`;
  let session = await pollManager.getVotingSession(userKey);

  if (!session) {
    session = {
      pollId,
      userId,
      selections: [],
    };
  }

  // Update selection
  const existingIndex = session.selections.findIndex(
    (s) => s.position === position,
  );
  if (existingIndex >= 0) {
    session.selections[existingIndex].nominationId = parseInt(selectedValue);
  } else {
    session.selections.push({
      position,
      nominationId: parseInt(selectedValue),
    });
  }

  // Save session
  await pollManager.setVotingSession(
    userKey,
    pollId,
    userId,
    session.selections,
  );

  // Check if vote is complete
  const poll = await pollManager.getPoll(pollId);
  const requiredSelections = Math.min(3, poll.nominations.length);
  const hasAllSelections = session.selections.length >= requiredSelections;

  if (hasAllSelections) {
    // Submit vote
    const rankings = session.selections
      .sort((a, b) => {
        const order = { first: 0, second: 1, third: 2 };
        return order[a.position] - order[b.position];
      })
      .map((s) => s.nominationId);

    await pollManager.submitVote(pollId, userId, rankings);
    await pollManager.deleteVotingSession(userKey);

    // Get poll for announcement
    const poll = await pollManager.getPoll(pollId);

    // // Send announcement to channel
    // try {
    //   if (poll?.channelId) {
    //     const announcementContent = `🗳️ **Vote Submitted!**\n\n<@${userId}> has voted in **${poll.title}**`;

    //     await sendDiscordMessage(
    //       poll.channelId,
    //       announcementContent,
    //       pollManager.env,
    //     );
    //   }
    // } catch (error) {
    //   console.error("Failed to announce vote:", error);
    // }

    const username =
      interaction.member?.user?.username || interaction.user?.username;

    return createResponse({
      content: `\n\u200b\n\u200b 🗳️ ${username} voted!\n\u200b`,
      embeds: [formatStatus(poll)],
    });
  }

  // Update interface with current selections
  return generateChrisStyleVotingInterface(poll, userId, session.selections);
}

// TODO: Only show the dropdown for the current selection
export async function handleChrisStyleSubmission(
  interaction,
  env,
  pollManager,
) {
  const pollId = interaction.data.custom_id.split("_")[3];
  const userId = interaction.member?.user?.id || interaction.user?.id;

  try {
    // Get voting session
    const userKey = `chris_${pollId}_${userId}`;
    const session = await pollManager.getVotingSession(userKey);

    // Get poll data to check requirements
    const poll = await pollManager.getPoll(pollId);
    if (!poll || poll.phase !== "voting") {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "❌ This poll is not in voting phase.",
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const totalOptions = poll.nominations?.length || 0;
    const requiredSelections = Math.min(3, totalOptions);

    if (
      !session ||
      Object.keys(session.selections).length < requiredSelections
    ) {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Please select all ${requiredSelections} options before submitting. You have selected ${Object.keys(session?.selections || {}).length}/${requiredSelections}.`,
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check for duplicate selections
    const selectedBooks = Object.values(session.selections);
    if (new Set(selectedBooks).size !== selectedBooks.length) {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              "❌ Each book can only be selected once. Please check your selections for duplicates.",
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Convert selections to rankings format
    const rankings = Object.entries(session.selections)
      .sort(([a], [b]) => {
        const order = { first: 0, second: 1, third: 2 };
        return order[a.position] - order[b.position];
      })
      .map(([position, nominationId]) => ({
        nominationId,
        position,
      }));

    if (rankings.length === 0) {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "❌ No valid selections found. Please make your selections.",
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Submit vote
    await pollManager.submitVote(pollId, userId, rankings);

    // Clean up session
    await pollManager.deleteVotingSession(userKey);

    const username =
      interaction.member?.user?.username || interaction.user?.username;

    return createResponse({
      content: `\n\u200b\n\u200b 🗳️ ${username} voted!\n\u200b`,
      embeds: [formatStatus(poll)],
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `❌ ${error.message}`,
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export function generateChrisStyleVotingInterface(
  poll,
  userId,
  existingSelections = [],
) {

  console.log("\n\nexistingSelections");
  console.log(JSON.stringify(existingSelections));

  const components = [];
  const nominations = poll.nominations;
  const maxSelections = Math.min(3, nominations.length);

  const positions = ["first", "second", "third"].slice(0, maxSelections);

  const selectedNominationIds = existingSelections.map((s) => s.nominationId);

  positions.forEach((position, index) => {
    if (index > existingSelections.length) {
      return;
    }

    const currentSelection = existingSelections.find(
      (s) => s.position === position,
    );
    const options = nominations
      .map((nom, idx) => ({
        label: nom.title.substring(0, 100),
        value: nom.id.toString(),
        description: nom.author ? `${nom.author}`.substring(0, 100) : undefined,
        default: currentSelection?.nominationId === nom.id,
      }))
      .filter(
        (option) =>
          option.default ||
          !selectedNominationIds.includes(parseInt(option.value)),
      );

    components.push({
      type: 1, // Action Row
      components: [
        {
          type: 3, // Select Menu
          custom_id: `chris_vote_${position}_${poll.id}`,
          placeholder: `Select your ${position} choice`,
          options,
          disabled: index < existingSelections.length,
        },
      ],
    });
  });

  const selectedCount = existingSelections.length;
  const statusText =
    selectedCount > 0
      ? `Selected ${selectedCount}/${maxSelections} choices`
      : "Make your selections below";

  return new Response(
    JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `📊 **Chris-Style Voting** - ${poll.title}\n\n${statusText}`,
        components,
        flags: 64,
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function formatChrisStyleResults(poll, { heading } = {}) {
  const results = poll.results;

  let nominationsList = "";

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

  const embed = {
    title: `${results.tie ? "❓" : "🏆"} ${poll.title} - ${heading || "Results"}`,
    description: results.tie
      ? `**Tie** Run /poll tie-break to specify the winner`
      : `**Winner:** ${results.winner.title}${results.winner.author ? ` by ${results.winner.author}` : ""}`,
    color: 0x00ff00,
    fields: [
      ...formatPollFields(poll),
      {
        name: "📊 Final Results",
        value: nominationsList,
        inline: false,
      },
    ],
    footer: { text: `Poll ID: ${poll.id}` },
    timestamp: new Date().toISOString(),
  };

  return embed;
}
