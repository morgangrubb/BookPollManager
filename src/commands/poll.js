// Serverless Poll Command for Cloudflare Workers
import { InteractionResponseType } from "discord-interactions";
import { PollManager } from "../services/pollManager.js";

export const pollCommand = {
  data: {
    name: "poll",
    description: "Manage book polls",
    options: [
      {
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
            description: "Nomination deadline (YYYY-MM-DD HH:MM)",
            type: 3, // STRING
            required: true,
          },
          {
            name: "voting_end",
            description: "Voting deadline (YYYY-MM-DD HH:MM)",
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
        ],
      },
      {
        name: "status",
        description: "Check poll status",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "nominate",
        description: "Nominate a book",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "title",
            description: "Book title",
            type: 3, // STRING
            required: true,
          },
          {
            name: "author",
            description: "Book author",
            type: 3, // STRING
            required: false,
          },
          {
            name: "link",
            description: "Link to book",
            type: 3, // STRING
            required: false,
          },
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "list",
        description: "List all polls",
        type: 1, // SUB_COMMAND
      },
      {
        name: "withdraw-nomination",
        description: "Withdraw your nomination from the active poll",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "vote",
        description: "Vote in the active poll",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "remove-nomination",
        description: "Remove a nomination (creator only)",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "nomination_id",
            description: "Nomination ID to remove",
            type: 3, // STRING
            required: true,
          },
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "end-nominations",
        description: "End nomination phase and start voting (creator only)",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "end-voting",
        description: "End voting phase and show results (creator only)",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
    ],
  },

  async execute(interaction, env) {
    const subcommand = interaction.data.options?.[0]?.name;
    const options = interaction.data.options?.[0]?.options || [];

    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Command timeout")), 8000);
      });

      const commandPromise = (async () => {
        const pollManager = new PollManager(env);

        switch (subcommand) {
          case "create":
            return await this.handleCreate(interaction, options, pollManager);
          case "status":
            return await this.handleStatus(interaction, options, pollManager);
          case "nominate":
            return await this.handleNominate(interaction, options, pollManager);
          case "list":
            return await this.handleList(interaction, pollManager);
          case "end-nominations":
            return await this.handleEndNominations(
              interaction,
              options,
              pollManager,
            );
          case "end-voting":
            return await this.handleEndVoting(
              interaction,
              options,
              pollManager,
            );
          default:
            return new Response(
              JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: "Unknown subcommand",
                  flags: 64, // Ephemeral
                },
              }),
              {
                headers: { "Content-Type": "application/json" },
              },
            );
        }
      })();

      return await Promise.race([commandPromise, timeoutPromise]);
    } catch (error) {
      console.error("Error executing poll command:", error);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              error.message === "Command timeout"
                ? "Request timed out. Please try again."
                : `Error: ${error.message}`,
            flags: 64, // Ephemeral
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  async handleCreate(interaction, options, pollManager) {
    try {
      const title = options.find((opt) => opt.name === "title")?.value;
      const nominationEnd = options.find(
        (opt) => opt.name === "nomination_end",
      )?.value;
      const votingEnd = options.find((opt) => opt.name === "voting_end")?.value;
      const tallyMethod =
        options.find((opt) => opt.name === "tally_method")?.value ||
        "ranked-choice";

      if (!title || !nominationEnd || !votingEnd) {
        throw new Error("Missing required parameters");
      }

      const nominationDeadline = new Date(nominationEnd);
      const votingDeadline = new Date(votingEnd);

      // Validate dates
      if (
        isNaN(nominationDeadline.getTime()) ||
        isNaN(votingDeadline.getTime())
      ) {
        throw new Error(
          "Invalid date format. Please use YYYY-MM-DD HH:MM format.",
        );
      }

      const now = new Date();
      if (nominationDeadline <= now) {
        throw new Error("Nomination deadline must be in the future.");
      }

      if (votingDeadline <= nominationDeadline) {
        throw new Error(
          "Voting deadline must be after the nomination deadline.",
        );
      }

      const pollData = {
        title,
        guildId: interaction.guild_id,
        channelId: interaction.channel_id,
        creatorId: interaction.member?.user?.id || interaction.user?.id,
        nominationDeadline: nominationDeadline.toISOString(),
        votingDeadline: votingDeadline.toISOString(),
        tallyMethod,
      };

      const poll = await pollManager.createPoll(pollData);

      if (!poll) {
        throw new Error("Failed to create poll");
      }

      const embed = {
        title: "📚 New Book Poll Created!",
        description: `**${poll.title}**`,
        color: 0x0099ff,
        fields: [
          {
            name: "📝 Current Phase",
            value: "Nomination",
            inline: true,
          },
          {
            name: "📊 Tally Method",
            value:
              tallyMethod === "chris-style" ? "Chris Style" : "Ranked Choice",
            inline: true,
          },
          {
            name: "⏰ Nomination Deadline",
            value: `<t:${Math.floor(nominationDeadline.getTime() / 1000)}:F>`,
            inline: false,
          },
          {
            name: "🗳️ Voting Deadline",
            value: `<t:${Math.floor(votingDeadline.getTime() / 1000)}:F>`,
            inline: false,
          },
        ],
        footer: { text: `Poll ID: ${poll.id}` },
        timestamp: new Date().toISOString(),
      };

      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [embed],
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error creating poll:", error);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error creating poll: ${error.message}`,
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  async handleStatus(interaction, options, pollManager) {
    try {
      let pollId = options.find((opt) => opt.name === "poll_id")?.value;

      if (!pollId) {
        const activePoll = await pollManager.getSingleActivePoll(
          interaction.guild_id,
        );
        if (activePoll) {
          pollId = activePoll.id;
        } else {
          return new Response(
            JSON.stringify({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "No active polls found. Please specify a poll ID.",
                flags: 64,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      const poll = await pollManager.getPoll(pollId);
      if (!poll) {
        return new Response(
          JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "Poll not found.",
              flags: 64,
            },
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const embed = this.createStatusEmbed(poll);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [embed],
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error getting poll status:", error);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error getting status: ${error.message}`,
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  async handleNominate(interaction, options, pollManager) {
    try {
      const title = options.find((opt) => opt.name === "title")?.value;
      const author = options.find((opt) => opt.name === "author")?.value;
      const link = options.find((opt) => opt.name === "link")?.value;
      let pollId = options.find((opt) => opt.name === "poll_id")?.value;

      if (!pollId) {
        const activePoll = await pollManager.getSingleActivePoll(
          interaction.guild_id,
        );
        if (activePoll && activePoll.phase === "nomination") {
          pollId = activePoll.id;
        } else {
          return new Response(
            JSON.stringify({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content:
                  "No active nomination phase found. Please specify a poll ID.",
                flags: 64,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      const nomination = {
        title,
        author,
        link,
        userId: interaction.member?.user?.id || interaction.user?.id,
        username:
          interaction.member?.user?.username || interaction.user?.username,
      };

      await pollManager.nominateBook(pollId, nomination);

      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `✅ Successfully nominated "${title}" ${author ? `by ${author}` : ""}!`,
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error nominating book:", error);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error: ${error.message}`,
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  async handleList(interaction, pollManager) {
    try {
      const polls = await pollManager.getAllPolls(interaction.guild_id);

      if (polls.length === 0) {
        return new Response(
          JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "📚 No polls found in this server.",
              flags: 64,
            },
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const pollList = polls
        .map(
          (poll) =>
            `\`${poll.id}\` - **${poll.title}** (${poll.phase}) - <t:${Math.floor(new Date(poll.createdAt).getTime() / 1000)}:R>`,
        )
        .join("\n");

      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              {
                title: "📚 Server Polls",
                description: pollList,
                color: 0x0099ff,
                timestamp: new Date().toISOString(),
              },
            ],
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error listing polls:", error);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error listing polls: ${error.message}`,
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  async handleEndNominations(interaction, options, pollManager) {
    try {
      let pollId = options.find((opt) => opt.name === "poll_id")?.value;

      if (!pollId) {
        const activePoll = await pollManager.getSingleActivePoll(
          interaction.guild_id,
        );
        if (activePoll && activePoll.phase === "nomination") {
          pollId = activePoll.id;
        } else {
          return new Response(
            JSON.stringify({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "No active nomination phase found.",
                flags: 64,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      await pollManager.updatePollPhase(pollId, "voting");

      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "✅ Nomination phase ended. Voting phase has begun!",
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 2, // Button
                    style: 1, // Primary
                    label: "🗳️ Vote Now",
                    custom_id: `vote_${pollId}`,
                  },
                ],
              },
            ],
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error ending nominations:", error);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error: ${error.message}`,
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  async handleEndVoting(interaction, options, pollManager) {
    try {
      let pollId = options.find((opt) => opt.name === "poll_id")?.value;

      if (!pollId) {
        const activePoll = await pollManager.getSingleActivePoll(
          interaction.guild_id,
        );
        if (activePoll && activePoll.phase === "voting") {
          pollId = activePoll.id;
        } else {
          return new Response(
            JSON.stringify({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "No active voting phase found.",
                flags: 64,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      const completedPoll = await pollManager.updatePollPhase(
        pollId,
        "completed",
      );

      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "✅ Voting phase ended. Poll completed!",
            embeds: [this.createStatusEmbed(completedPoll)],
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error ending voting:", error);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error: ${error.message}`,
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  createStatusEmbed(poll) {
    const embed = {
      title: `📚 ${poll.title}`,
      color:
        poll.phase === "completed"
          ? 0x00ff00
          : poll.phase === "voting"
            ? 0xffaa00
            : 0x0099ff,
      fields: [
        {
          name: "📝 Phase",
          value: poll.phase.charAt(0).toUpperCase() + poll.phase.slice(1),
          inline: true,
        },
        {
          name: "📊 Tally Method",
          value:
            poll.tallyMethod === "chris-style"
              ? "Chris Style"
              : "Ranked Choice",
          inline: true,
        },
        {
          name: "📚 Nominations",
          value: poll.nominations.length.toString(),
          inline: true,
        },
      ],
      footer: { text: `Poll ID: ${poll.id}` },
      timestamp: new Date().toISOString(),
    };

    // Add nominations list
    if (poll.nominations.length > 0) {
      const nominationsList = poll.nominations
        .map(
          (nom, idx) =>
            `${idx + 1}. **${nom.title}** ${nom.author ? `by ${nom.author}` : ""}`,
        )
        .join("\n");

      embed.fields.push({
        name: "📖 Nominated Books",
        value: nominationsList,
        inline: false,
      });
    }

    // Add voting information
    if (poll.phase === "voting") {
      embed.fields.push({
        name: "🗳️ Votes Cast",
        value: poll.votes.length.toString(),
        inline: true,
      });
    }

    // Add results for completed polls
    if (poll.phase === "completed" && poll.results) {
      const results = poll.results;
      if (results.winner) {
        embed.fields.push({
          name: "🏆 Winner",
          value: `**${results.winner.title}** ${results.winner.author ? `by ${results.winner.author}` : ""}`,
          inline: false,
        });
      }
    }

    return embed;
  },
};
