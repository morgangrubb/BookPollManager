// Full Discord Bot functionality using vanilla Cloudflare Workers
import { InteractionResponseType } from "discord-interactions";
import { PollManager } from "./services/pollManager.js";
import { checkPollPhases } from "./services/scheduler.js";
import { handleInteraction } from "./interactions/index.js";
import { verifyDiscordSignature } from "./utils/discord/verifySignature.js";

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
          return await handleInteraction(interaction, env);
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
