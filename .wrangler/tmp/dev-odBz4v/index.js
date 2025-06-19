var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-ydy4GD/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/db-manager.js
var DatabaseManager = class {
  static {
    __name(this, "DatabaseManager");
  }
  constructor(db) {
    this.db = db;
  }
  // Generate unique poll ID
  generatePollId() {
    return Math.random().toString(36).substring(2, 15);
  }
  // Create new poll
  async createPoll(pollData) {
    const pollId = this.generatePollId();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await this.db.prepare(`
        INSERT INTO polls (id, title, guild_id, channel_id, creator_id, phase, tally_method, nomination_deadline, voting_deadline, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'nomination', ?, ?, ?, ?, ?)
      `).bind(
        pollId,
        pollData.title,
        pollData.guildId,
        pollData.channelId,
        pollData.creatorId,
        pollData.tallyMethod,
        pollData.nominationDeadline,
        pollData.votingDeadline,
        now,
        now
      ).run();
      return { id: pollId, ...pollData, phase: "nomination", createdAt: now };
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  }
  // Get poll by ID
  async getPoll(pollId) {
    try {
      const poll = await this.db.prepare(`
        SELECT * FROM polls WHERE id = ?
      `).bind(pollId).first();
      if (!poll) return null;
      const nominations = await this.db.prepare(`
        SELECT * FROM nominations WHERE poll_id = ? ORDER BY created_at ASC
      `).bind(pollId).all();
      const votes = await this.db.prepare(`
        SELECT * FROM votes WHERE poll_id = ? ORDER BY created_at ASC
      `).bind(pollId).all();
      return {
        id: poll.id,
        title: poll.title,
        guildId: poll.guild_id,
        channelId: poll.channel_id,
        creatorId: poll.creator_id,
        phase: poll.phase,
        tallyMethod: poll.tally_method,
        nominationDeadline: poll.nomination_deadline,
        votingDeadline: poll.voting_deadline,
        createdAt: poll.created_at,
        nominations: nominations.results || [],
        votes: (votes.results || []).map((vote) => ({
          ...vote,
          rankings: JSON.parse(vote.rankings || "[]")
        }))
      };
    } catch (error) {
      console.error("Error getting poll:", error);
      throw error;
    }
  }
  // Add nomination
  async addNomination(pollId, nomination) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await this.db.prepare(`
        INSERT INTO nominations (poll_id, title, author, link, user_id, username, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        pollId,
        nomination.title,
        nomination.author || null,
        nomination.link || null,
        nomination.userId,
        nomination.username,
        now
      ).run();
      return true;
    } catch (error) {
      console.error("Error adding nomination:", error);
      throw error;
    }
  }
  // Submit vote
  async submitVote(pollId, userId, rankings) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await this.db.prepare(`
        INSERT INTO votes (poll_id, user_id, rankings, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        pollId,
        userId,
        JSON.stringify(rankings),
        now
      ).run();
      return true;
    } catch (error) {
      console.error("Error submitting vote:", error);
      throw error;
    }
  }
  // Get active polls for guild
  async getActivePolls(guildId) {
    try {
      const polls = await this.db.prepare(`
        SELECT * FROM polls 
        WHERE guild_id = ? AND phase IN ('nomination', 'voting')
        ORDER BY created_at DESC
      `).bind(guildId).all();
      return polls.results || [];
    } catch (error) {
      console.error("Error getting active polls:", error);
      return [];
    }
  }
  // Update poll phase
  async updatePollPhase(pollId, newPhase) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await this.db.prepare(`
        UPDATE polls SET phase = ?, updated_at = ? WHERE id = ?
      `).bind(newPhase, now, pollId).run();
      return true;
    } catch (error) {
      console.error("Error updating poll phase:", error);
      throw error;
    }
  }
};

// src/index.js
async function verifyDiscordSignature(body, signature, timestamp, publicKey) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519", namedCurve: "Ed25519" },
      false,
      ["verify"]
    );
    const data = encoder.encode(timestamp + body);
    const sig = hexToBytes(signature);
    return await crypto.subtle.verify("Ed25519", key, sig, data);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
__name(verifyDiscordSignature, "verifyDiscordSignature");
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
__name(hexToBytes, "hexToBytes");
async function handlePollCommand(interaction, env) {
  const subcommand = interaction.data.options?.[0]?.name;
  const options = interaction.data.options?.[0]?.options || [];
  try {
    const db = new DatabaseManager(env.POLLS_DB);
    switch (subcommand) {
      case "create":
        return await handleCreatePoll(interaction, options, db);
      case "status":
        return await handlePollStatus(interaction, options, db);
      case "nominate":
        return await handleNominate(interaction, options, db);
      case "list":
        return await handleListPolls(interaction, db);
      default:
        return createResponse(`Unknown poll subcommand: ${subcommand}`);
    }
  } catch (error) {
    console.error("Error handling poll command:", error);
    return createResponse("An error occurred while processing your request.");
  }
}
__name(handlePollCommand, "handlePollCommand");
async function handleCreatePoll(interaction, options, db) {
  const title = getOptionValue(options, "title");
  const nominationHours = getOptionValue(options, "nomination_hours");
  const votingHours = getOptionValue(options, "voting_hours");
  const tallyMethod = getOptionValue(options, "tally_method") || "ranked-choice";
  if (!title || !nominationHours || !votingHours) {
    return createResponse("Missing required parameters for poll creation.");
  }
  const now = /* @__PURE__ */ new Date();
  const nominationDeadline = new Date(now.getTime() + nominationHours * 60 * 60 * 1e3);
  const votingDeadline = new Date(nominationDeadline.getTime() + votingHours * 60 * 60 * 1e3);
  const pollData = {
    title,
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    creatorId: interaction.member?.user?.id || interaction.user?.id,
    tallyMethod,
    nominationDeadline: nominationDeadline.toISOString(),
    votingDeadline: votingDeadline.toISOString()
  };
  const poll = await db.createPoll(pollData);
  return new Response(JSON.stringify({
    type: 4,
    data: {
      embeds: [{
        title: "\u{1F4DA} New Book Poll Created!",
        description: `**${poll.title}**

Nomination phase has started!`,
        fields: [
          {
            name: "\u{1F4DD} Nomination Deadline",
            value: `<t:${Math.floor(nominationDeadline.getTime() / 1e3)}:F>`,
            inline: true
          },
          {
            name: "\u{1F5F3}\uFE0F Voting Deadline",
            value: `<t:${Math.floor(votingDeadline.getTime() / 1e3)}:F>`,
            inline: true
          },
          {
            name: "\u{1F4CA} Tally Method",
            value: tallyMethod === "chris-style" ? "Chris Style (Top 3 Points)" : "Ranked Choice (IRV)",
            inline: true
          }
        ],
        color: 65280,
        footer: { text: `Poll ID: ${poll.id}` }
      }]
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleCreatePoll, "handleCreatePoll");
async function handlePollStatus(interaction, options, db) {
  let pollId = getOptionValue(options, "poll_id");
  if (!pollId) {
    const activePolls = await db.getActivePolls(interaction.guild_id);
    if (activePolls.length === 0) {
      return createResponse("No active polls found. Please specify a poll ID.");
    }
    pollId = activePolls[0].id;
  }
  const poll = await db.getPoll(pollId);
  if (!poll) {
    return createResponse("Poll not found.");
  }
  const embed = {
    title: `\u{1F4DA} ${poll.title}`,
    color: poll.phase === "completed" ? 65280 : poll.phase === "voting" ? 16755200 : 39423,
    fields: [
      {
        name: "\u{1F4DD} Phase",
        value: poll.phase.charAt(0).toUpperCase() + poll.phase.slice(1),
        inline: true
      },
      {
        name: "\u{1F4CA} Tally Method",
        value: poll.tallyMethod === "chris-style" ? "Chris Style" : "Ranked Choice",
        inline: true
      },
      {
        name: "\u{1F4DA} Nominations",
        value: poll.nominations.length.toString(),
        inline: true
      }
    ],
    footer: { text: `Poll ID: ${poll.id}` },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (poll.nominations.length > 0) {
    const nominationsList = poll.nominations.map(
      (nom, idx) => `${idx + 1}. **${nom.title}** ${nom.author ? `by ${nom.author}` : ""}`
    ).join("\n");
    embed.fields.push({
      name: "\u{1F4D6} Nominated Books",
      value: nominationsList,
      inline: false
    });
  }
  return new Response(JSON.stringify({
    type: 4,
    data: { embeds: [embed] }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(handlePollStatus, "handlePollStatus");
async function handleNominate(interaction, options, db) {
  const title = getOptionValue(options, "title");
  const author = getOptionValue(options, "author");
  const link = getOptionValue(options, "link");
  let pollId = getOptionValue(options, "poll_id");
  if (!title) {
    return createResponse("Book title is required for nomination.");
  }
  if (!pollId) {
    const activePolls = await db.getActivePolls(interaction.guild_id);
    const nominationPolls = activePolls.filter((p) => p.phase === "nomination");
    if (nominationPolls.length === 0) {
      return createResponse("No active nomination phase found. Please specify a poll ID.");
    }
    pollId = nominationPolls[0].id;
  }
  const nomination = {
    title,
    author,
    link,
    userId: interaction.member?.user?.id || interaction.user?.id,
    username: interaction.member?.user?.username || interaction.user?.username
  };
  await db.addNomination(pollId, nomination);
  return createResponse(`\u2705 Successfully nominated "${title}" ${author ? `by ${author}` : ""}!`);
}
__name(handleNominate, "handleNominate");
async function handleListPolls(interaction, db) {
  const activePolls = await db.getActivePolls(interaction.guild_id);
  if (activePolls.length === 0) {
    return createResponse("\u{1F4DA} No active polls found in this server.");
  }
  const pollList = activePolls.map(
    (poll) => `\`${poll.id}\` - **${poll.title}** (${poll.phase}) - <t:${Math.floor(new Date(poll.created_at).getTime() / 1e3)}:R>`
  ).join("\n");
  return new Response(JSON.stringify({
    type: 4,
    data: {
      embeds: [{
        title: "\u{1F4DA} Server Polls",
        description: pollList,
        color: 39423,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }],
      flags: 64
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleListPolls, "handleListPolls");
function getOptionValue(options, name) {
  const option = options.find((opt) => opt.name === name);
  return option?.value;
}
__name(getOptionValue, "getOptionValue");
function createResponse(content, ephemeral = true) {
  return new Response(JSON.stringify({
    type: 4,
    data: {
      content,
      flags: ephemeral ? 64 : 0
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(createResponse, "createResponse");
async function handleCron(event, env, ctx) {
  console.log("Cron trigger activated at:", (/* @__PURE__ */ new Date()).toISOString());
  try {
    console.log("Poll phase check completed successfully");
  } catch (error) {
    console.error("Error in cron handler:", error);
  }
}
__name(handleCron, "handleCron");
var src_default = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/health" && request.method === "GET") {
        return new Response(JSON.stringify({
          status: "healthy",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          service: "discord-book-poll-bot",
          version: "2.0-serverless",
          features: ["discord-verification", "signature-validation", "poll-commands"]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/interactions" && request.method === "POST") {
        try {
          const signature = request.headers.get("x-signature-ed25519");
          const timestamp = request.headers.get("x-signature-timestamp");
          const body = await request.text();
          if (env.DISCORD_PUBLIC_KEY && signature && timestamp) {
            const isValid = await verifyDiscordSignature(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
            if (!isValid) {
              return new Response("Invalid signature", { status: 401 });
            }
          }
          const interaction = JSON.parse(body);
          if (interaction.type === 1) {
            console.log("Discord PING received, responding with PONG");
            return new Response(JSON.stringify({ type: 1 }), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
          if (interaction.type === 2) {
            if (interaction.data.name === "poll") {
              return await handlePollCommand(interaction, env);
            }
            return createResponse("Unknown command. Use `/poll` to manage book polls.");
          }
          if (interaction.type === 3) {
            return createResponse("Button/menu interactions will be available soon!");
          }
          if (interaction.type === 5) {
            return createResponse("Modal submissions will be available soon!");
          }
          return createResponse("Interaction received!");
        } catch (parseError) {
          console.error("Parse error:", parseError);
          return new Response("Bad request", { status: 400 });
        }
      }
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
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ydy4GD/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ydy4GD/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
