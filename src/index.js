// Full Discord Bot functionality using vanilla Cloudflare Workers
import { InteractionResponseType } from "discord-interactions";
import { PollManager } from "./services/pollManager.js";
import { checkPollPhases } from "./services/scheduler.js";
import { handleInteraction } from "./interactions/index.js";
import { verifyDiscordSignature } from "./utils/discord/verifySignature.js";
import { renderProvisionalScoresPage } from "./utils/provisionalScores.js";
import { computeStats } from "./utils/stats.js";
import { renderStatsPage } from "./utils/statsPage.js";
import { renderPollsPage } from "./utils/pollsPage.js";
import { renderPollPage } from "./utils/pollPage.js";
import { renderWinnersCsv } from "./utils/winnersCsv.js";

const COMPLETED_POLLS_PER_PAGE = 20;

function parsePageNumber(url) {
  const rawPage = url.searchParams.get("page");
  const page = rawPage === null ? 1 : Number(rawPage);
  return Number.isInteger(page) && page > 0 ? page : 1;
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

      // Invite link endpoint - redirects to Discord OAuth bot invite URL
      if (url.pathname === "/invite" && request.method === "GET") {
        const clientId = env.DISCORD_CLIENT_ID;
        if (!clientId) {
          return new Response("DISCORD_CLIENT_ID not configured", { status: 500 });
        }
        const permissions = "84992"; // VIEW_CHANNEL + SEND_MESSAGES + EMBED_LINKS + READ_MESSAGE_HISTORY
        const inviteUrl =
          `https://discord.com/api/oauth2/authorize` +
          `?client_id=${clientId}` +
          `&permissions=${permissions}` +
          `&scope=bot%20applications.commands`;
        return Response.redirect(inviteUrl, 302);
      }

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

      // Hidden page showing provisional scores for the currently active poll.
      // Not linked anywhere - access is gated by a secret token so a leaked
      // URL without the token doesn't expose in-progress vote standings.
      if (url.pathname === "/provisional-scores" && request.method === "GET") {
        const token = url.searchParams.get("token");
        if (!env.SCORES_PAGE_TOKEN || token !== env.SCORES_PAGE_TOKEN) {
          return new Response("Not Found", { status: 404 });
        }

        const pollManager = new PollManager(env);
        const activePolls = await pollManager.getActivePolls();
        const poll =
          activePolls.length > 0
            ? await pollManager.getPoll(activePolls[0].id)
            : null;

        return new Response(renderProvisionalScoresPage(poll), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Page showing historical stats (nomination wins, first-pick accuracy,
      // points cast toward winners) across all completed polls. Not linked
      // anywhere, but unlike /provisional-scores it only reflects finished
      // polls, so it isn't gated by a token.
      if (url.pathname === "/stats" && request.method === "GET") {
        const pollManager = new PollManager(env);
        const completedPolls = await pollManager.getCompletedPolls();
        const stats = computeStats(completedPolls);

        return new Response(renderStatsPage(stats), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Download all completed, non-test poll winners as CSV. Unlike the HTML
      // listing this export is not paginated.
      if (url.pathname === "/polls.csv" && request.method === "GET") {
        const pollManager = new PollManager(env);
        const winners = await pollManager.getCompletedPollWinners();

        return new Response(renderWinnersCsv(winners), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="poll-winners.csv"',
          },
        });
      }

      // Public page listing completed, non-test polls. The page number is
      // supplied as ?page=N and defaults to the first page.
      if (url.pathname === "/polls" && request.method === "GET") {
        const pollManager = new PollManager(env);
        const page = await pollManager.getCompletedPollsPage(
          parsePageNumber(url),
          COMPLETED_POLLS_PER_PAGE,
        );

        return new Response(renderPollsPage(page), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Public detail page for a completed, non-test poll.
      const pollPathMatch = url.pathname.match(/^\/poll\/([^/]+)$/);
      if (pollPathMatch && request.method === "GET") {
        let pollId;
        try {
          pollId = decodeURIComponent(pollPathMatch[1]);
        } catch {
          return new Response("Not Found", { status: 404 });
        }

        const pollManager = new PollManager(env);
        const poll = await pollManager.getPoll(pollId);
        if (!poll || poll.phase !== "completed" || poll.isTest) {
          return new Response("Not Found", { status: 404 });
        }

        return new Response(renderPollPage(poll), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
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
          return await handleInteraction(interaction, env, ctx);
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
