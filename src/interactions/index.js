// src/interactions/index.js
import { InteractionResponseType } from "discord-interactions";
import { createResponse } from "../utils/createResponse.js";
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
import { handlePollExtend } from "./extend.js";
import { handleAddVote } from "./add-vote.js";
import { handleTestOob } from "./test-oob.js";
import { handleChrisStyleVoting } from "../utils/chrisStyle.js";
import { handleRankedChoiceVoting } from "../utils/rankedChoice.js";
import { getPollAndStatus } from "../utils/discord/pollHelpers.js";

const commandHandlers = {
  create: handleCreatePoll,
  delete: handleDeletePoll,
  "edit-nomination": handleEditNomination,
  "end-nominations": handleEndNominations,
  "end-voting": handleEndVoting,
  extend: handlePollExtend,
  "add-vote": handleAddVote,
  "test-oob": handleTestOob,
  list: handleListPolls,
  nominate: handleNominate,
  announce: handlePollAnnounce,
  status: handlePollStatus,
  "remove-nomination": handleRemoveNomination,
  "tie-break": handleTieBreak,
  vote: handleVote,
  "withdraw-nomination": handleWithdrawNomination,
};

export async function handlePollCommand(interaction, env, ctx) {
  const subcommand = interaction.data.options?.[0]?.name;
  const handler = commandHandlers[subcommand];

  if (handler) {
    try {
      const opts = await getPollAndStatus(interaction, env, ctx);
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

export async function handleInteraction(interaction, env, ctx) {
  const interactionHandlers = {
    1: () =>
      new Response(JSON.stringify({ type: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    2: handleApplicationCommand,
    3: handleMessageComponent,
  };

  const handler = interactionHandlers[interaction.type];
  return handler
    ? handler(interaction, env, ctx)
    : createResponse({
        ephemeral: true,
        content: "Interaction received!",
      });
}

async function handleApplicationCommand(interaction, env, ctx) {
  if (interaction.data.name === "poll") {
    return await handlePollCommand(interaction, env, ctx);
  }
  return createResponse({
    ephemeral: true,
    content: "Unknown command. Use `/poll` to manage book polls.",
  });
}

async function handleMessageComponent(interaction, env, ctx) {
  const customId = interaction.data.custom_id;
  const componentHandlers = {
    chris_vote_: handleSelectMenuInteraction,
    ranked_choice_: handleSelectMenuInteraction,
    tie_break_: handleTieBreakInteraction,
  };

  for (const prefix in componentHandlers) {
    if (customId.startsWith(prefix)) {
      return await componentHandlers[prefix](interaction, env, ctx);
    }
  }

  return createResponse({
    type: 4,
    data: {
      content: `Unknown component interaction: ${customId}`,
      flags: 64,
    },
  });
}

async function handleSelectMenuInteraction(interaction, env, ctx) {
  const pollManager = new PollManager(env);
  const customId = interaction.data.custom_id;

  if (customId.startsWith("chris_vote_")) {
    return await handleChrisStyleVoting(interaction, env, pollManager, ctx);
  } else if (customId.startsWith("ranked_choice_")) {
    return await handleRankedChoiceVoting(interaction, env, pollManager, ctx);
  }

  return createResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Unknown select menu interaction",
      flags: 64,
    },
  });
}

async function handleTieBreakInteraction(interaction, env, ctx) {
  const opts = await getPollAndStatus(interaction, env, ctx);
  return await handleTieBreak(opts);
}
