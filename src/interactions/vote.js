// src/interactions/vote.js
import { createResponse } from "../utils/createResponse.js";
import {
  generateChrisStyleVotingInterface,
  handleChrisStyleSubmission,
} from "../utils/chrisStyle.js";
import {
  generateRankedChoiceVotingInterface,
  handleRankedChoiceSubmission,
} from "../utils/rankedChoice.js";

export const voteCommand = {
  name: "vote",
  description: "Vote in the active poll",
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

export async function handleVote({ interaction, poll, userId }) {
  if (poll.phase !== "voting") {
    return createResponse({
      ephemeral: true,
      content: "This poll is not in the voting phase.",
    });
  }

  // Check if user already voted
  const existingVote = (poll.votes || []).some(
    (vote) => vote.userId === userId
  );

  if (existingVote) {
    return createResponse({
      ephemeral: true,
      content: "You have already voted in this poll!",
    });
  }

  // Generate voting interface based on tally method
  if (poll.tallyMethod === "chris-style") {
    return generateChrisStyleVotingInterface(
      poll,
      interaction.member?.user?.id || interaction.user?.id
    );
  } else {
    return generateRankedChoiceVotingInterface(poll);
  }
}

export async function handleVoteButton(interaction, env, pollManager) {
  const customId = interaction.data.custom_id;
  const pollId = customId.replace("vote_", "");
  const poll = await pollManager.getPoll(pollId);

  if (!poll) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "Poll not found!",
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (poll.phase !== "voting") {
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: `This poll is currently in the ${poll.phase} phase. Voting is not available yet.`,
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const userId = interaction.member?.user?.id || interaction.user?.id;

  // Check if user already voted
  const existingVote = await pollManager.getVote(pollId, userId);

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
      }
    );
  }

  // Generate voting interface based on tally method
  if (poll.tallyMethod === "chris-style") {
    return generateChrisStyleVotingInterface(poll, userId);
  } else {
    return generateRankedChoiceVotingInterface(poll);
  }
}

export async function handleModalSubmit(interaction, env, pollManager) {
  if (interaction.data.custom_id.startsWith("ranked_vote_")) {
    return await handleRankedChoiceSubmission(interaction, env, pollManager);
  }
  return new Response(
    JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Unknown modal submission",
        flags: 64,
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}

