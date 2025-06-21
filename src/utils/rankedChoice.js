import { InteractionResponseType } from "discord-interactions";
import { sendDiscordMessage } from "./sendDiscordMessage.js";

/**
 * Implements Instant Runoff Voting (IRV) for ranked choice voting
 * @param {Array} candidates - Array of nomination objects
 * @param {Array} votes - Array of vote objects with rankings
 * @returns {Object} Results object with winner and elimination rounds
 */
export function calculateRankedChoiceWinner(candidates, votes) {
  if (candidates.length === 0) {
    return { winner: null, rounds: [], totalVotes: votes.length };
  }

  if (candidates.length === 1) {
    return {
      winner: candidates[0],
      rounds: [{ eliminated: null, votes: { [0]: votes.length } }],
      totalVotes: votes.length,
    };
  }

  let remainingCandidates = [...candidates];
  let currentVotes = votes.map((vote) => ({ ...vote }));
  const rounds = [];

  while (remainingCandidates.length > 1) {
    // Count first choice votes for remaining candidates
    const voteCounts = {};
    remainingCandidates.forEach((_, index) => {
      voteCounts[index] = 0;
    });

    currentVotes.forEach((vote) => {
      // Find the highest ranked remaining candidate
      for (const ranking of vote.rankings) {
        const candidateIndex = ranking - 1;
        if (remainingCandidates[candidateIndex]) {
          voteCounts[candidateIndex]++;
          break;
        }
      }
    });

    // Check if any candidate has majority
    const totalVotes = Object.values(voteCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const majority = Math.floor(totalVotes / 2) + 1;

    for (const [index, count] of Object.entries(voteCounts)) {
      if (count >= majority) {
        rounds.push({ eliminated: null, votes: voteCounts });
        return {
          winner: remainingCandidates[index],
          rounds,
          totalVotes: votes.length,
        };
      }
    }

    // Find candidate with least votes to eliminate
    let minVotes = Infinity;
    let eliminateIndex = -1;

    for (const [index, count] of Object.entries(voteCounts)) {
      if (count < minVotes) {
        minVotes = count;
        eliminateIndex = parseInt(index);
      }
    }

    // Record this round
    rounds.push({
      eliminated: remainingCandidates[eliminateIndex],
      votes: { ...voteCounts },
    });

    // Remove eliminated candidate
    remainingCandidates.splice(eliminateIndex, 1);

    // Update vote rankings to remove eliminated candidate
    currentVotes.forEach((vote) => {
      vote.rankings = vote.rankings.filter(
        (ranking) => remainingCandidates[ranking - 1] !== undefined,
      );
    });
  }

  return {
    winner: remainingCandidates[0] || null,
    rounds,
    totalVotes: votes.length,
  };
}

/**
 * Format results for display
 * @param {Object} results - Results from calculateRankedChoiceWinner
 * @returns {String} Formatted results string
 */
export function formatResults(results) {
  if (!results.winner) {
    return "No winner determined.";
  }

  let output = `Winner: ${results.winner.title}\n\n`;

  if (results.rounds.length > 1) {
    output += "Elimination rounds:\n";
    results.rounds.forEach((round, index) => {
      if (round.eliminated) {
        output += `Round ${index + 1}: ${round.eliminated.title} eliminated\n`;
      }
    });
  }

  return output;
}

export async function handleRankedChoiceVoting(interaction, env, pollManager) {
  const customId = interaction.data.custom_id;
  const pollId = customId.split("_")[2];
  const rank = parseInt(customId.split("_")[4]);
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const selectedValue = interaction.data.values[0];

  try {
    // Get poll first to ensure it exists
    const poll = await pollManager.getPoll(pollId);
    if (!poll || !poll.nominations) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "❌ Poll not found or has no nominations.",
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get or create voting session
    const userKey = `ranked_${pollId}_${userId}`;
    let session = await pollManager.getVotingSession(userKey);

    if (!session) {
      session = { pollId, userId, selections: {} };
    }

    // Update selection for this rank
    const bookIndex = parseInt(selectedValue.split("_")[1]);
    session.selections[rank] = bookIndex;

    // Save updated session
    await pollManager.setVotingSession(
      userKey,
      pollId,
      userId,
      session.selections,
    );

    // Show current selections
    const nominations = poll.nominations || [];

    const currentSelections = Object.entries(session.selections)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([rank, bookIdx]) => {
        const book = nominations[bookIdx];
        return `${rank}. ${book?.title || "Unknown"} by ${book?.author || "Unknown Author"}`;
      });

    const totalOptions = nominations.length;
    const selectedCount = Object.keys(session.selections).length;

    const selectionsDisplay =
      currentSelections.length > 0
        ? `**Current Rankings:**\n${currentSelections.join("\n")}`
        : "No rankings selected yet.";

    const progressText = `Progress: ${selectedCount}/${totalOptions} books ranked`;
    const statusText =
      selectedCount === totalOptions
        ? "All books ranked! Click Submit to finalize your vote."
        : `Continue ranking the remaining ${totalOptions - selectedCount} book${totalOptions - selectedCount !== 1 ? "s" : ""}.`;

    return new Response(
      JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✅ Ranking updated!\n\n${selectionsDisplay}\n\n${progressText}\n${statusText}`,
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
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

export async function handleRankedChoiceSubmission(
  interaction,
  env,
  pollManager,
) {
  const pollId = interaction.data.custom_id.split("_")[3];
  const userId = interaction.member?.user?.id || interaction.user?.id;

  try {
    // Get voting session
    const userKey = `ranked_${pollId}_${userId}`;
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
    const requiredSelections = totalOptions;

    if (
      !session ||
      Object.keys(session.selections).length < requiredSelections
    ) {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Please rank all ${totalOptions} options before submitting. You have selected ${Object.keys(session?.selections || {}).length}/${requiredSelections}.`,
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
              "❌ Each book can only be selected once. Please check your rankings for duplicates.",
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Convert selections to rankings format
    const nominations = poll.nominations || [];
    const rankings = Object.entries(session.selections)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([rank, bookIdx]) => {
        const book = nominations[bookIdx];
        return {
          nominationId: book?.id || book?.title,
          title: book?.title,
          author: book?.author,
        };
      });

    if (rankings.length === 0) {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "❌ No valid rankings found. Please make your selections.",
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

    const rankingsDisplay = rankings
      .map(
        (book, idx) =>
          `${idx + 1}. ${book.title} by ${book.author || "Unknown Author"}`,
      )
      .join("\n");

    // Send announcement to channel
    try {
      if (poll.channelId) {
        const userName =
          interaction.member?.user?.username ||
          interaction.user?.username ||
          "Someone";
        const announcementContent = `🗳️ **Vote Submitted!**\n\n<@${userId}> has voted in **${poll.title}**`;

        await sendDiscordMessage(
          poll.channelId,
          announcementContent,
          pollManager.env,
        );
      }
    } catch (error) {
      console.error("Failed to announce vote:", error);
    }

    return new Response(
      JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✅ Your ranked vote has been submitted!\n\n**Your Rankings:**\n${rankingsDisplay}`,
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
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

export function generateRankedChoiceVotingInterface(poll) {
  const nominations = poll.nominations || [];

  if (nominations.length === 0) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "❌ No nominations available for voting.",
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Create dropdown options for each book
  const bookOptions = nominations.map((nom, idx) => ({
    label: `${nom.title} by ${nom.author || "Unknown Author"}`,
    value: `book_${idx}`,
    description:
      nom.title.length > 50 ? nom.title.substring(0, 47) + "..." : nom.title,
  }));

  // Create select components for ranking ALL options
  const components = [];
  const totalOptions = nominations.length;

  for (let i = 0; i < totalOptions; i++) {
    const rank = i + 1;
    const rankSuffix =
      rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";

    components.push({
      type: 1, // ACTION_ROW
      components: [
        {
          type: 3, // SELECT_MENU
          custom_id: `ranked_choice_${poll.id}_rank_${rank}`,
          placeholder: `${rank}${rankSuffix} Choice (Required)`,
          options: bookOptions,
          min_values: 1,
          max_values: 1,
        },
      ],
    });
  }

  // Add submit button - CRITICAL: Must be added separately
  components.push({
    type: 1, // ACTION_ROW
    components: [
      {
        type: 2, // BUTTON
        custom_id: `submit_ranked_vote_${poll.id}`,
        label: "Submit Ranked Vote",
        style: 3, // SUCCESS
        emoji: { name: "🗳️" },
      },
    ],
  });

  const instructionText =
    totalOptions === 1
      ? "Only one option available - this will be automatically selected as your choice."
      : totalOptions === 2
        ? "Rank both books in order of preference (1st choice and 2nd choice)."
        : `Rank all ${totalOptions} books in order of preference (1st choice through ${totalOptions}${totalOptions === 3 ? "rd" : "th"} choice).`;

  return new Response(
    JSON.stringify({
      type: 4,
      data: {
        embeds: [
          {
            title: `🗳️ Ranked Choice Voting: ${poll.title}`,
            description: `${instructionText}\n\n**Available Books:**\n${nominations.map((nom, idx) => `${idx + 1}. **${nom.title}** by ${nom.author || "Unknown Author"}`).join("\n")}`,
            color: 0xff9900,
            footer: {
              text:
                totalOptions === 1
                  ? "Click Submit to confirm your vote"
                  : "Rank all books, then click Submit",
            },
          },
        ],
        components,
        flags: 64,
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
