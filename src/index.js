// Full Discord Bot functionality using vanilla Cloudflare Workers
import { InteractionResponseType } from "discord-interactions";
import { PollManager } from "./services/pollManager.js";
import { checkPollPhases } from "./services/scheduler.js";
import {
  handleCreatePoll,
  handleDeletePoll,
  handleEndNominations,
  handleEndVoting,
  handleListPolls,
  handleNominate,
  handlePollStatus,
  handleRemoveNomination,
  handleVote,
  handleWithdrawNomination,
} from "./interactions/handlers.js";
import { createResponse } from "./utils/createResponse.js";
import { getOptionValue } from "./utils/getOptionValue.js";
import {
  generateChrisStyleVotingInterface,
  handleChrisStyleVoting,
} from "./utils/chrisStyle.js";
import {
  generateRankedChoiceVotingInterface,
  handleRankedChoiceVoting,
} from "./utils/rankedChoice.js";

// Signature verification using Web Crypto API
async function verifyDiscordSignature(body, signature, timestamp, publicKey) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519", namedCurve: "Ed25519" },
      false,
      ["verify"],
    );

    const data = encoder.encode(timestamp + body);
    const sig = hexToBytes(signature);

    return await crypto.subtle.verify("Ed25519", key, sig, data);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Poll command handler
async function handlePollCommand(interaction, env) {
  const subcommand = interaction.data.options?.[0]?.name;
  const options = interaction.data.options?.[0]?.options || [];

  try {
    const pollManager = new PollManager(env);

    const opts = {
      interaction,
      env,
      options,
      pollManager,
      ...(await getPollAndStatus(interaction, options, pollManager)),
    };

    switch (subcommand) {
      case "create":
        return await handleCreatePoll(opts);
      case "status":
        return await handlePollStatus(opts);
      case "nominate":
        return await handleNominate(opts);
      case "list":
        return await handleListPolls(opts);
      case "withdraw-nomination":
        return await handleWithdrawNomination(opts);
      case "vote":
        return await handleVote(opts);
      case "remove-nomination":
        return await handleRemoveNomination(opts);
      case "end-nominations":
        return await handleEndNominations(opts);
      case "end-voting":
        return await handleEndVoting(opts);
      case "delete":
        return await handleDeletePoll(opts);
      default:
        return createResponse(`Unknown poll subcommand: ${subcommand}`);
    }
  } catch (error) {
    console.error("Error handling poll command:", error);
    return createResponse(`❌ ${error.message}`);
  }
}

// async function handleButtonInteraction(interaction, env) {
//   try {
//     const timeoutPromise = new Promise((_, reject) => {
//       setTimeout(() => reject(new Error("Handler timeout")), 8000);
//     });

//     const handlerPromise = (async () => {
//       const pollManager = new PollManager(env);
//       const customId = interaction.data.custom_id;

//       // Handle submit buttons for voting
//       if (customId.startsWith("submit_chris_vote_")) {
//         return await handleChrisStyleSubmission(interaction, env, pollManager);
//       } else if (customId.startsWith("submit_ranked_vote_")) {
//         return await handleRankedChoiceSubmission(
//           interaction,
//           env,
//           pollManager,
//         );
//       }

//       // Handle legacy vote buttons
//       if (customId.startsWith("vote_")) {
//         const pollId = customId.replace("vote_", "");
//         const poll = await pollManager.getPoll(pollId);

//         if (!poll) {
//           return new Response(
//             JSON.stringify({
//               type: 4,
//               data: {
//                 content: "Poll not found!",
//                 flags: 64,
//               },
//             }),
//             {
//               headers: { "Content-Type": "application/json" },
//             },
//           );
//         }

//         if (poll.phase !== "voting") {
//           return new Response(
//             JSON.stringify({
//               type: 4,
//               data: {
//                 content: `This poll is currently in the ${poll.phase} phase. Voting is not available yet.`,
//                 flags: 64,
//               },
//             }),
//             {
//               headers: { "Content-Type": "application/json" },
//             },
//           );
//         }

//         const userId = interaction.member?.user?.id || interaction.user?.id;

//         // Check if user already voted
//         const existingVote = await pollManager.getVote(pollId, userId);

//         if (existingVote) {
//           return new Response(
//             JSON.stringify({
//               type: 4,
//               data: {
//                 content: "You have already voted in this poll!",
//                 flags: 64,
//               },
//             }),
//             {
//               headers: { "Content-Type": "application/json" },
//             },
//           );
//         }

//         // Generate voting interface based on tally method
//         if (poll.tallyMethod === "chris-style") {
//           return generateChrisStyleVotingInterface(poll, userId);
//         } else {
//           return generateRankedChoiceVotingInterface(poll);
//         }
//       }

//       return new Response(
//         JSON.stringify({
//           type: 4,
//           data: {
//             content: `❌ Unknown button interaction: ${customId}`,
//             flags: 64,
//           },
//         }),
//         {
//           headers: { "Content-Type": "application/json" },
//         },
//       );
//     })();

//     return await Promise.race([handlerPromise, timeoutPromise]);
//   } catch (error) {
//     console.error("Error handling button interaction:", error);
//     return new Response(
//       JSON.stringify({
//         type: 4,
//         data: {
//           content:
//             error.message === "Handler timeout"
//               ? "Request timed out. Please try again."
//               : "An error occurred. Please try again.",
//           flags: 64,
//         },
//       }),
//       {
//         headers: { "Content-Type": "application/json" },
//       },
//     );
//   }
// }

async function handleSelectMenuInteraction(interaction, env) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Handler timeout")), 8000);
    });

    const handlerPromise = (async () => {
      const pollManager = new PollManager(env);
      const customId = interaction.data.custom_id;

      if (customId.startsWith("chris_vote_")) {
        return await handleChrisStyleVoting(interaction, env, pollManager);
      } else if (customId.startsWith("ranked_choice_")) {
        return await handleRankedChoiceVoting(interaction, env, pollManager);
      }

      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Unknown select menu interaction",
            flags: 64,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    })();

    return await Promise.race([handlerPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error handling select menu:", error);
    return new Response(
      JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            error.message === "Handler timeout"
              ? "Request timed out. Please try again."
              : "An error occurred. Please try again.",
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function handleModalSubmit(interaction, env) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Handler timeout")), 8000);
    });

    const handlerPromise = (async () => {
      const pollManager = new PollManager(env);

      if (interaction.data.custom_id.startsWith("ranked_vote_")) {
        return await handleRankedChoiceSubmission(
          interaction,
          env,
          pollManager,
        );
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
        },
      );
    })();

    return await Promise.race([handlerPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error handling modal submit:", error);
    return new Response(
      JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            error.message === "Handler timeout"
              ? "Request timed out. Please try again."
              : "An error occurred. Please try again.",
          flags: 64,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function getPollAndStatus(interaction, options, pollManager) {
  const userId = interaction?.member?.user?.id || interaction?.user?.id;
  let pollId = getOptionValue(options, "poll_id");

  let poll;
  if (pollId) {
    poll = await pollManager.getPoll(pollId);

    if (!poll) {
      return createResponse(`❌ Poll not found`);
    }

    if (poll.guildId !== interaction.guild_id) {
      return createResponse(`❌ Poll not found`);
    }
  } else {
    poll = await pollManager.getSingleActivePoll(interaction.guild_id);
  }

  // console.log(
  //   JSON.stringify(
  //     {
  //       poll,
  //       userId,
  //       isAdmin: isAdmin(interaction),
  //       isPollCreator: poll && userId === (poll.creatorId || poll.authorId),
  //     },
  //     null,
  //     2,
  //   ),
  // );

  return {
    poll,
    userId,
    isAdmin: isAdmin(interaction),
    isPollCreator: poll && userId === (poll.creatorId || poll.authorId),
  };
}

function isAdmin(interaction) {
  const userPermissions = interaction?.member?.permissions;
  return userPermissions && (parseInt(userPermissions) & 0x8) === 0x8; // ADMINISTRATOR permission
}

// Cron handler for poll phase transitions
async function handleCron(event, env, ctx) {
  console.log("Cron trigger activated at:", new Date().toISOString());

  try {
    await checkPollPhases(env);
    console.log("Poll phase check completed successfully");
  } catch (error) {
    console.error("Error in cron handler:", error);
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === "/health" && request.method === "GET") {
        return new Response(
          JSON.stringify({
            status: "healthy",
            timestamp: new Date().toISOString(),
            service: "discord-book-poll-bot",
            version: "2.0-serverless",
            features: [
              "discord-verification",
              "signature-validation",
              "poll-commands",
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Discord interactions endpoint
      if (url.pathname === "/interactions" && request.method === "POST") {
        try {
          const signature = request.headers.get("x-signature-ed25519");
          const timestamp = request.headers.get("x-signature-timestamp");
          const body = await request.text();

          // Verify signature if public key is available
          if (env.DISCORD_PUBLIC_KEY && signature && timestamp) {
            const isValid = await verifyDiscordSignature(
              body,
              signature,
              timestamp,
              env.DISCORD_PUBLIC_KEY,
            );
            if (!isValid) {
              return new Response("Invalid signature", { status: 401 });
            }
          }

          const interaction = JSON.parse(body);

          // Handle ping (type 1) - Discord verification
          if (interaction.type === 1) {
            console.log("Discord PING received, responding with PONG");
            return new Response(JSON.stringify({ type: 1 }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Handle slash commands (type 2)
          if (interaction.type === 2) {
            if (interaction.data.name === "poll") {
              return await handlePollCommand(interaction, env);
            }

            return createResponse(
              "Unknown command. Use `/poll` to manage book polls.",
            );
          }

          // Handle message components (type 3) - buttons, select menus
          if (interaction.type === 3) {
            const customId = interaction.data.custom_id;

            // Button interactions (submit buttons, vote buttons)
            if (
              customId.startsWith("submit_") ||
              customId.startsWith("vote_")
            ) {
              return await handleButtonInteraction(interaction, env);
            }

            // Select menu interactions (chris-style, ranked choice)
            if (
              customId.startsWith("chris_vote_") ||
              customId.startsWith("ranked_choice_")
            ) {
              return await handleSelectMenuInteraction(interaction, env);
            }

            // Fallback for unknown components
            return new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content: `Unknown component interaction: ${customId}`,
                  flags: 64,
                },
              }),
              {
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Handle modal submissions (type 5)
          if (interaction.type === 5) {
            return await handleModalSubmit(interaction, env);
          }

          return createResponse("Interaction received!");
        } catch (parseError) {
          console.error("Parse error:", parseError);
          return new Response("Bad request", { status: 400 });
        }
      }

      // 404 for all other routes
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },

  async scheduled(event, env, ctx) {
    try {
      return await handleCron(event, env, ctx);
    } catch (error) {
      console.error("Scheduled error:", error);
    }
  },
};
