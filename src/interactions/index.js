// src/interactions/index.js
import { InteractionResponseType } from "discord-interactions";
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
import { handleVote, handleVoteButton, handleModalSubmit } from "./vote.js";
import { handleWithdrawNomination } from "./withdraw-nomination.js";
import {
  handleChrisStyleVoting,
  handleChrisStyleSubmission,
} from "../utils/chrisStyle.js";
import {
  handleRankedChoiceVoting,
  handleRankedChoiceSubmission,
} from "../utils/rankedChoice.js";
import { getPollAndStatus } from "../utils/pollHelpers.js";

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

export async function handleInteraction(interaction, env) {
  const interactionHandlers = {
    1: () =>
      new Response(JSON.stringify({ type: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    2: handleApplicationCommand,
    3: handleMessageComponent,
    5: handleModalSubmitInteraction,
  };

  const handler = interactionHandlers[interaction.type];
  return handler
    ? handler(interaction, env)
    : createResponse({
        ephemeral: true,
        content: "Interaction received!",
      });
}

async function handleApplicationCommand(interaction, env) {
  if (interaction.data.name === "poll") {
    return await handlePollCommand(interaction, env);
  }
  return createResponse({
    ephemeral: true,
    content: "Unknown command. Use `/poll` to manage book polls.",
  });
}

async function handleMessageComponent(interaction, env) {
  const customId = interaction.data.custom_id;
  const componentHandlers = {
    submit_: handleButtonInteraction,
    vote_: handleButtonInteraction,
    chris_vote_: handleSelectMenuInteraction,
    ranked_choice_: handleSelectMenuInteraction,
    tie_break_: handleTieBreakInteraction,
  };

  for (const prefix in componentHandlers) {
    if (customId.startsWith(prefix)) {
      return await componentHandlers[prefix](interaction, env);
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

async function handleButtonInteraction(interaction, env) {
  const pollManager = new PollManager(env);
  const customId = interaction.data.custom_id;

  if (customId.startsWith("submit_chris_vote_")) {
    return await handleChrisStyleSubmission(interaction, env, pollManager);
  } else if (customId.startsWith("submit_ranked_vote_")) {
    return await handleRankedChoiceSubmission(interaction, env, pollManager);
  } else if (customId.startsWith("vote_")) {
    return await handleVoteButton(interaction, env, pollManager);
  }

  return createResponse({
    type: 4,
    data: {
      content: `❌ Unknown button interaction: ${customId}`,
      flags: 64,
    },
  });
}

async function handleSelectMenuInteraction(interaction, env) {
  const pollManager = new PollManager(env);
  const customId = interaction.data.custom_id;

  if (customId.startsWith("chris_vote_")) {
    return await handleChrisStyleVoting(interaction, env, pollManager);
  } else if (customId.startsWith("ranked_choice_")) {
    return await handleRankedChoiceVoting(interaction, env, pollManager);
  }

  return createResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Unknown select menu interaction",
      flags: 64,
    },
  });
}

async function handleTieBreakInteraction(interaction, env) {
  const opts = await getPollAndStatus(interaction, env);
  opts.poll = await opts.pollManager.getPoll(
    interaction.data.custom_id.replace("tie_break_", ""),
  );
  opts.isPollCreator = isPollCreator(opts.poll, interaction.member.user.id);
  return await handleTieBreak(opts);
}

async function handleModalSubmitInteraction(interaction, env) {
  const pollManager = new PollManager(env);
  if (interaction.data.custom_id.startsWith("ranked_vote_")) {
    return await handleRankedChoiceSubmission(interaction, env, pollManager);
  }
  return createResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Unknown modal submission",
      flags: 64,
    },
  });
}
