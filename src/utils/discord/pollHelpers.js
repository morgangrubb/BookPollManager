// Helper functions for poll command context and permissions

import { getOptionValue } from "../getOptionValue.js";
import { createResponse } from "../createResponse.js";
import { PollManager } from "../../services/pollManager.js";

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
