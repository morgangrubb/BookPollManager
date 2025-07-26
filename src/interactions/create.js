// src/interactions/create.js
import { getOptionValue } from "../utils/getOptionValue.js";
import { createResponse } from "../utils/createResponse.js";
import { formatPollFooterLine } from "../utils/format.js";

export const createPollCommand = {
  name: "create",
  description: "Create a new book poll",
  type: 1, // SUB_COMMAND
  options: [
    {
      name: "title",
      description: "Poll title",
      type: 3, // STRING
      required: true,
    },
    {
      name: "nomination_end",
      description:
        "Nomination deadline (YYYY-MM-DD HH:MM) (hour and minute optional)",
      type: 3, // STRING
      required: true,
    },
    {
      name: "voting_end",
      description:
        "Voting deadline (YYYY-MM-DD HH:MM) (hour and minute optional)",
      type: 3, // STRING
      required: true,
    },
    {
      name: "tally_method",
      description: "Voting method",
      type: 3, // STRING
      required: false,
      choices: [
        {
          name: "Ranked Choice (rank all books)",
          value: "ranked-choice",
        },
        { name: "Chris Style (top 3 picks)", value: "chris-style" },
      ],
    },
    {
      name: "description",
      description: "Description (optional)",
      type: 3, // STRING
      required: false,
    },
    {
      name: "quote",
      description: "Quote (optional, displayed when a user votes)",
      type: 3, // STRING
      required: false,
    },
  ],
};

export async function handleCreatePoll({ interaction, options, pollManager }) {
  const title = getOptionValue(options, "title");
  const nominationEnd = getOptionValue(options, "nomination_end");
  const votingEnd = getOptionValue(options, "voting_end");
  const tallyMethod =
    getOptionValue(options, "tally_method") || "ranked-choice";
  const description = getOptionValue(options, "description");
  const quote = getOptionValue(options, "quote");

  if (!title || !nominationEnd || !votingEnd) {
    return createResponse({
      ephemeral: true,
      content: "Missing required parameters for poll creation.",
    });
  }

  const nominationDeadline = new Date(nominationEnd);
  const votingDeadline = new Date(votingEnd);

  // Validate dates
  if (isNaN(nominationDeadline.getTime()) || isNaN(votingDeadline.getTime())) {
    return createResponse({
      ephemeral: true,
      content: "Invalid date format. Please use YYYY-MM-DD HH:MM format.",
    });
  }

  const now = new Date();
  if (nominationDeadline <= now) {
    return createResponse({
      ephemeral: true,
      content: "Nomination deadline must be in the future.",
    });
  }

  if (votingDeadline <= nominationDeadline) {
    return createResponse({
      ephemeral: true,
      content: "Voting deadline must be after the nomination deadline.",
    });
  }

  const pollData = {
    title,
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    creatorId: interaction.member?.user?.id || interaction.user?.id,
    tallyMethod,
    nominationEnd: nominationDeadline.toISOString(),
    votingEnd: votingDeadline.toISOString(),
    description,
    quote,
  };

  const poll = await pollManager.createPoll(pollData);

  return new Response(
    JSON.stringify({
      type: 4,
      data: {
        embeds: [
          {
            title: "📚 New Book Poll Created!",
            description: description
              ? `**${title}**\n\n${description}\n\nNomination phase has started!`
              : `**${title}**\n\nNomination phase has started!`,
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
