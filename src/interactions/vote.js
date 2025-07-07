// src/interactions/vote.js
import { createResponse } from "../utils/createResponse.js";
import { generateChrisStyleVotingInterface } from "../utils/chrisStyle.js";
import { generateRankedChoiceVotingInterface } from "../utils/rankedChoice.js";

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
  console.log(1);
  if (poll.phase !== "voting") {
    return createResponse({
      ephemeral: true,
      content: "This poll is not in the voting phase.",
    });
  }
  console.log(2);

  // Check if user already voted
  const existingVote = (poll.votes || []).some(
    (vote) => vote.userId === userId,
  );
  console.log(3);

  if (existingVote) {
    return createResponse({
      ephemeral: true,
      content: "You have already voted in this poll!",
    });
  }
  console.log(poll.tallyMethod);

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
