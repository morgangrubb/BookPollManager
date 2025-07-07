// src/interactions/index.js
import { createResponse } from "../utils/createResponse.js";
import { getOptionValue } from "../utils/getOptionValue.js";
import { PollManager } from "../services/pollManager.js";

import { handleCreatePoll } from "./create.js";
import { handleDeletePoll } from "./delete.js";
import { handleEditNomination } from "./edit-nomination.js";
import { handleEndNominations } from "./end-nominations.js";
import { handleEndVoting } from "./end-voting.js";
import { handleListPolls } from "./list.js";
import { handleNominate } from "./nominate.js";
import { handlePollAnnounce } from "./announce.js";
import { handlePollStatus } from "./status.js";
import { handleRemoveNomination } from "./remove-nomination.js";
import { handleTieBreak } from "./tie-break.js";
import { handleVote } from "./vote.js";
import { handleWithdrawNomination } from "./withdraw-nomination.js";

const commandHandlers = {
  create: handleCreatePoll,
  delete: handleDeletePoll,
  "edit-nomination": handleEditNomination,
  "end-nominations": handleEndNominations,
  "end-voting": handleEndVoting,
  list: handleListPolls,
  nominate: handleNominate,
  announce: handlePollAnnounce,
  status: handlePollStatus,
  "remove-nomination": handleRemoveNomination,
  "tie-break": handleTieBreak,
  vote: handleVote,
  "withdraw-nomination": handleWithdrawNomination,
};

async function getPollAndStatus(interaction, env) {
  const pollManager = new PollManager(env);
  const userId = interaction?.member?.user?.id || interaction?.user?.id;
  const options = interaction.data.options?.[0]?.options || [];
  let pollId = getOptionValue(options, "poll_id");

  let poll;
  if (pollId) {
    poll = await pollManager.getPoll(pollId);

    if (!poll) {
      return createResponse({
        ephemeral: true,
        content: `❌ Poll not found`,
      });
    }

    if (poll.guildId !== interaction.guild_id) {
      return createResponse({
        ephemeral: true,
        content: `❌ Poll not found`,
      });
    }
  } else {
    poll = await pollManager.getSingleActivePoll(interaction.guild_id);
    poll = poll || (await pollManager.getMostRecentPoll(interaction.guild_id));
  }

  return {
    interaction,
    pollManager,
    env,
    options,
    poll,
    userId,
    isAdmin: isAdmin(interaction),
    isPollCreator: isPollCreator(poll, userId),
  };
}

function isAdmin(interaction) {
  const userPermissions = interaction?.member?.permissions;
  return userPermissions && (parseInt(userPermissions) & 0x8) === 0x8; // ADMINISTRATOR permission
}

function isPollCreator(poll, userId) {
  return poll && userId === (poll.creatorId || poll.authorId);
}

export async function handlePollCommand(interaction, env) {
  const subcommand = interaction.data.options?.[0]?.name;
  const handler = commandHandlers[subcommand];

  if (handler) {
    try {
      const opts = await getPollAndStatus(interaction, env);
      return await handler(opts);
    } catch (error) {
      console.error(`Error handling subcommand "${subcommand}":`, error);
      return createResponse({
        ephemeral: true,
        content: `❌ An error occurred while processing your request.`,
      });
    }
  } else {
    return createResponse({
      ephemeral: true,
      content: `Unknown poll subcommand: ${subcommand}`,
    });
  }
}
