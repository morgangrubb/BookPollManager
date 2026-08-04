import { InteractionResponseType } from "discord-interactions";
import { sendDiscordMessage } from "./sendDiscordMessage.js";
import { sendDiscordDm } from "./sendDiscordDm.js";
import { runInBackground } from "./backgroundTask.js";
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
  if (sortedResults.length > 0 && votes.length > 0) {
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

export async function handleChrisStyleVoting(interaction, env, pollManager, ctx) {
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

    const username =
      interaction.member?.user?.username || interaction.user?.username;

    // Build the ordered list of the user's chosen nominations for the DM
    const positionLabels = { first: "1st", second: "2nd", third: "3rd" };
    const orderedSelections = rankings.map((nominationId, idx) => {
      const nom = poll.nominations.find((n) => n.id === nominationId);
      const positionKey = ["first", "second", "third"][idx];
      const label = positionLabels[positionKey];
      return `**${label}** — ${nom ? formatNomination(nom, { includeUser: false }) : `#${nominationId}`}`;
    });

    const dmFields = [
      {
        name: "🗳️ Your Choices",
        value: orderedSelections.join("\n"),
        inline: false,
      },
    ];

    if (poll.quote) {
      dmFields.push({
        name: "\u200b",
        value: `*${poll.quote}*`,
        inline: false,
      });
    }

    // Send private DM confirming the vote with their selections and the quote
    runInBackground(
      ctx,
      sendDiscordDm(
        userId,
        {
          embeds: [
            {
              title: "✅ Your vote has been recorded!",
              description: `Your choices for **${poll.title}** have been saved.`,
              color: 0x57f287, // Discord green
              fields: dmFields,
              footer: { text: `Poll ID: ${poll.id}` },
            },
          ],
        },
        env,
      ).catch((err) => {
        console.error("chris-style: Failed to send vote confirmation DM:", err);
      }),
    );

    // Build the public reply: who voted and how long until voting ends
    const votingDeadlineTs = Math.floor(
      new Date(poll.votingDeadline).getTime() / 1000,
    );

    return createResponse({
      content:
        `🗳️ **${username}** voted in **${poll.title}**!\n` +
        `Voting closes <t:${votingDeadlineTs}:R> (<t:${votingDeadlineTs}:F>).`,
    });
  }

  // Update interface with current selections
  return generateChrisStyleVotingInterface(poll, userId, session.selections, {
    update: true,
  });
}

export function generateChrisStyleVotingInterface(
  poll,
  userId,
  existingSelections = [],
  { update = false } = {},
) {
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
      type: update
        ? InteractionResponseType.UPDATE_MESSAGE
        : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
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

  let description;

  if (results.tie) {
    description = `**Tie** Run /poll tie-break to specify the winner`;
  } else {
    let nominationsList = "";

    const sorted = [...poll.results.standings].sort(
      (a, b) => (b.points ?? 0) - (a.points ?? 0),
    );

    // Now ensure that results.winner is first in the sorted list
    const winnerIndex = sorted.findIndex(
      (standing) => standing.nomination.id === results.winner.id,
    );
    if (winnerIndex !== -1) {
      const [winner] = sorted.splice(winnerIndex, 1);
      sorted.unshift(winner);
    }

    nominationsList = sorted
      .map(
        (standing, idx) =>
          `${idx + 1}. ${formatNomination(standing.nomination)} — **${standing.points ?? 0}** point${standing.points === 1 ? "" : "s"}`,
      )
      .join("\n");

    description = `**Winner**\n ${formatNomination(results.winner)}\n\n**Final standings**\n${nominationsList}`;
  }

  const embed = {
    title: `${results.tie ? "❓" : "🏆"} ${poll.title} - ${heading || "Results"}`,
    description,
    color: 0x00ff00,
    fields: formatPollFields(poll),
    footer: { text: `Poll ID: ${poll.id}` },
    timestamp: new Date().toISOString(),
  };

  return embed;
}
