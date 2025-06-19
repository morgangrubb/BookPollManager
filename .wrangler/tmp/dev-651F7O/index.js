var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// .wrangler/tmp/bundle-jLdUh1/checked-fetch.js
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
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-jLdUh1/checked-fetch.js"() {
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_checked_fetch();
    init_modules_watch_stub();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// node_modules/discord-interactions/dist/util.js
var require_util = __commonJS({
  "node_modules/discord-interactions/dist/util.js"(exports) {
    "use strict";
    init_checked_fetch();
    init_modules_watch_stub();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.concatUint8Arrays = exports.valueToUint8Array = exports.subtleCrypto = void 0;
    function getSubtleCrypto() {
      if (typeof window !== "undefined" && window.crypto) {
        return window.crypto.subtle;
      }
      if (typeof globalThis !== "undefined" && globalThis.crypto) {
        return globalThis.crypto.subtle;
      }
      if (typeof crypto !== "undefined") {
        return crypto.subtle;
      }
      if (typeof __require === "function") {
        const cryptoPackage = "node:crypto";
        const crypto2 = __require(cryptoPackage);
        return crypto2.webcrypto.subtle;
      }
      throw new Error("No Web Crypto API implementation found");
    }
    __name(getSubtleCrypto, "getSubtleCrypto");
    exports.subtleCrypto = getSubtleCrypto();
    function valueToUint8Array(value, format) {
      if (value == null) {
        return new Uint8Array();
      }
      if (typeof value === "string") {
        if (format === "hex") {
          const matches = value.match(/.{1,2}/g);
          if (matches == null) {
            throw new Error("Value is not a valid hex string");
          }
          const hexVal = matches.map((byte) => Number.parseInt(byte, 16));
          return new Uint8Array(hexVal);
        }
        return new TextEncoder().encode(value);
      }
      try {
        if (Buffer.isBuffer(value)) {
          return new Uint8Array(value);
        }
      } catch (ex) {
      }
      if (value instanceof ArrayBuffer) {
        return new Uint8Array(value);
      }
      if (value instanceof Uint8Array) {
        return value;
      }
      throw new Error("Unrecognized value type, must be one of: string, Buffer, ArrayBuffer, Uint8Array");
    }
    __name(valueToUint8Array, "valueToUint8Array");
    exports.valueToUint8Array = valueToUint8Array;
    function concatUint8Arrays(arr1, arr2) {
      const merged = new Uint8Array(arr1.length + arr2.length);
      merged.set(arr1);
      merged.set(arr2, arr1.length);
      return merged;
    }
    __name(concatUint8Arrays, "concatUint8Arrays");
    exports.concatUint8Arrays = concatUint8Arrays;
  }
});

// node_modules/discord-interactions/dist/components.js
var require_components = __commonJS({
  "node_modules/discord-interactions/dist/components.js"(exports) {
    "use strict";
    init_checked_fetch();
    init_modules_watch_stub();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SeparatorSpacingTypes = exports.TextStyleTypes = exports.ChannelTypes = exports.ButtonStyleTypes = exports.MessageComponentTypes = void 0;
    var MessageComponentTypes;
    (function(MessageComponentTypes2) {
      MessageComponentTypes2[MessageComponentTypes2["ACTION_ROW"] = 1] = "ACTION_ROW";
      MessageComponentTypes2[MessageComponentTypes2["BUTTON"] = 2] = "BUTTON";
      MessageComponentTypes2[MessageComponentTypes2["STRING_SELECT"] = 3] = "STRING_SELECT";
      MessageComponentTypes2[MessageComponentTypes2["INPUT_TEXT"] = 4] = "INPUT_TEXT";
      MessageComponentTypes2[MessageComponentTypes2["USER_SELECT"] = 5] = "USER_SELECT";
      MessageComponentTypes2[MessageComponentTypes2["ROLE_SELECT"] = 6] = "ROLE_SELECT";
      MessageComponentTypes2[MessageComponentTypes2["MENTIONABLE_SELECT"] = 7] = "MENTIONABLE_SELECT";
      MessageComponentTypes2[MessageComponentTypes2["CHANNEL_SELECT"] = 8] = "CHANNEL_SELECT";
      MessageComponentTypes2[MessageComponentTypes2["SECTION"] = 9] = "SECTION";
      MessageComponentTypes2[MessageComponentTypes2["TEXT_DISPLAY"] = 10] = "TEXT_DISPLAY";
      MessageComponentTypes2[MessageComponentTypes2["THUMBNAIL"] = 11] = "THUMBNAIL";
      MessageComponentTypes2[MessageComponentTypes2["MEDIA_GALLERY"] = 12] = "MEDIA_GALLERY";
      MessageComponentTypes2[MessageComponentTypes2["FILE"] = 13] = "FILE";
      MessageComponentTypes2[MessageComponentTypes2["SEPARATOR"] = 14] = "SEPARATOR";
      MessageComponentTypes2[MessageComponentTypes2["CONTAINER"] = 17] = "CONTAINER";
    })(MessageComponentTypes || (exports.MessageComponentTypes = MessageComponentTypes = {}));
    var ButtonStyleTypes;
    (function(ButtonStyleTypes2) {
      ButtonStyleTypes2[ButtonStyleTypes2["PRIMARY"] = 1] = "PRIMARY";
      ButtonStyleTypes2[ButtonStyleTypes2["SECONDARY"] = 2] = "SECONDARY";
      ButtonStyleTypes2[ButtonStyleTypes2["SUCCESS"] = 3] = "SUCCESS";
      ButtonStyleTypes2[ButtonStyleTypes2["DANGER"] = 4] = "DANGER";
      ButtonStyleTypes2[ButtonStyleTypes2["LINK"] = 5] = "LINK";
      ButtonStyleTypes2[ButtonStyleTypes2["PREMIUM"] = 6] = "PREMIUM";
    })(ButtonStyleTypes || (exports.ButtonStyleTypes = ButtonStyleTypes = {}));
    var ChannelTypes;
    (function(ChannelTypes2) {
      ChannelTypes2[ChannelTypes2["DM"] = 1] = "DM";
      ChannelTypes2[ChannelTypes2["GROUP_DM"] = 3] = "GROUP_DM";
      ChannelTypes2[ChannelTypes2["GUILD_TEXT"] = 0] = "GUILD_TEXT";
      ChannelTypes2[ChannelTypes2["GUILD_VOICE"] = 2] = "GUILD_VOICE";
      ChannelTypes2[ChannelTypes2["GUILD_CATEGORY"] = 4] = "GUILD_CATEGORY";
      ChannelTypes2[ChannelTypes2["GUILD_ANNOUNCEMENT"] = 5] = "GUILD_ANNOUNCEMENT";
      ChannelTypes2[ChannelTypes2["GUILD_STORE"] = 6] = "GUILD_STORE";
    })(ChannelTypes || (exports.ChannelTypes = ChannelTypes = {}));
    var TextStyleTypes;
    (function(TextStyleTypes2) {
      TextStyleTypes2[TextStyleTypes2["SHORT"] = 1] = "SHORT";
      TextStyleTypes2[TextStyleTypes2["PARAGRAPH"] = 2] = "PARAGRAPH";
    })(TextStyleTypes || (exports.TextStyleTypes = TextStyleTypes = {}));
    var SeparatorSpacingTypes;
    (function(SeparatorSpacingTypes2) {
      SeparatorSpacingTypes2[SeparatorSpacingTypes2["SMALL"] = 1] = "SMALL";
      SeparatorSpacingTypes2[SeparatorSpacingTypes2["LARGE"] = 2] = "LARGE";
    })(SeparatorSpacingTypes || (exports.SeparatorSpacingTypes = SeparatorSpacingTypes = {}));
  }
});

// node_modules/discord-interactions/dist/webhooks.js
var require_webhooks = __commonJS({
  "node_modules/discord-interactions/dist/webhooks.js"(exports) {
    "use strict";
    init_checked_fetch();
    init_modules_watch_stub();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebhookEventType = exports.WebhookType = void 0;
    var WebhookType;
    (function(WebhookType2) {
      WebhookType2[WebhookType2["PING"] = 0] = "PING";
      WebhookType2[WebhookType2["EVENT"] = 1] = "EVENT";
    })(WebhookType || (exports.WebhookType = WebhookType = {}));
    var WebhookEventType;
    (function(WebhookEventType2) {
      WebhookEventType2["APPLICATION_AUTHORIZED"] = "APPLICATION_AUTHORIZED";
      WebhookEventType2["ENTITLEMENT_CREATE"] = "ENTITLEMENT_CREATE";
      WebhookEventType2["QUEST_USER_ENROLLMENT"] = "QUEST_USER_ENROLLMENT";
    })(WebhookEventType || (exports.WebhookEventType = WebhookEventType = {}));
  }
});

// node_modules/discord-interactions/dist/index.js
var require_dist = __commonJS({
  "node_modules/discord-interactions/dist/index.js"(exports) {
    "use strict";
    init_checked_fetch();
    init_modules_watch_stub();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o2, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: /* @__PURE__ */ __name(function() {
          return m[k];
        }, "get") };
      }
      Object.defineProperty(o2, k2, desc);
    } : function(o2, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o2[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p2 in m) if (p2 !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p2)) __createBinding(exports2, m, p2);
    };
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.verifyKeyMiddleware = exports.verifyKey = exports.InteractionResponseFlags = exports.InteractionResponseType = exports.InteractionType = void 0;
    var util_1 = require_util();
    var InteractionType2;
    (function(InteractionType3) {
      InteractionType3[InteractionType3["PING"] = 1] = "PING";
      InteractionType3[InteractionType3["APPLICATION_COMMAND"] = 2] = "APPLICATION_COMMAND";
      InteractionType3[InteractionType3["MESSAGE_COMPONENT"] = 3] = "MESSAGE_COMPONENT";
      InteractionType3[InteractionType3["APPLICATION_COMMAND_AUTOCOMPLETE"] = 4] = "APPLICATION_COMMAND_AUTOCOMPLETE";
      InteractionType3[InteractionType3["MODAL_SUBMIT"] = 5] = "MODAL_SUBMIT";
    })(InteractionType2 || (exports.InteractionType = InteractionType2 = {}));
    var InteractionResponseType4;
    (function(InteractionResponseType5) {
      InteractionResponseType5[InteractionResponseType5["PONG"] = 1] = "PONG";
      InteractionResponseType5[InteractionResponseType5["CHANNEL_MESSAGE_WITH_SOURCE"] = 4] = "CHANNEL_MESSAGE_WITH_SOURCE";
      InteractionResponseType5[InteractionResponseType5["DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE"] = 5] = "DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE";
      InteractionResponseType5[InteractionResponseType5["DEFERRED_UPDATE_MESSAGE"] = 6] = "DEFERRED_UPDATE_MESSAGE";
      InteractionResponseType5[InteractionResponseType5["UPDATE_MESSAGE"] = 7] = "UPDATE_MESSAGE";
      InteractionResponseType5[InteractionResponseType5["APPLICATION_COMMAND_AUTOCOMPLETE_RESULT"] = 8] = "APPLICATION_COMMAND_AUTOCOMPLETE_RESULT";
      InteractionResponseType5[InteractionResponseType5["MODAL"] = 9] = "MODAL";
      InteractionResponseType5[InteractionResponseType5["PREMIUM_REQUIRED"] = 10] = "PREMIUM_REQUIRED";
      InteractionResponseType5[InteractionResponseType5["LAUNCH_ACTIVITY"] = 12] = "LAUNCH_ACTIVITY";
    })(InteractionResponseType4 || (exports.InteractionResponseType = InteractionResponseType4 = {}));
    var InteractionResponseFlags;
    (function(InteractionResponseFlags2) {
      InteractionResponseFlags2[InteractionResponseFlags2["EPHEMERAL"] = 64] = "EPHEMERAL";
      InteractionResponseFlags2[InteractionResponseFlags2["IS_COMPONENTS_V2"] = 32768] = "IS_COMPONENTS_V2";
    })(InteractionResponseFlags || (exports.InteractionResponseFlags = InteractionResponseFlags = {}));
    function verifyKey2(rawBody, signature, timestamp, clientPublicKey) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          const timestampData = (0, util_1.valueToUint8Array)(timestamp);
          const bodyData = (0, util_1.valueToUint8Array)(rawBody);
          const message = (0, util_1.concatUint8Arrays)(timestampData, bodyData);
          const publicKey = typeof clientPublicKey === "string" ? yield util_1.subtleCrypto.importKey("raw", (0, util_1.valueToUint8Array)(clientPublicKey, "hex"), {
            name: "ed25519",
            namedCurve: "ed25519"
          }, false, ["verify"]) : clientPublicKey;
          const isValid = yield util_1.subtleCrypto.verify({
            name: "ed25519"
          }, publicKey, (0, util_1.valueToUint8Array)(signature, "hex"), message);
          return isValid;
        } catch (ex) {
          return false;
        }
      });
    }
    __name(verifyKey2, "verifyKey");
    exports.verifyKey = verifyKey2;
    function verifyKeyMiddleware(clientPublicKey) {
      if (!clientPublicKey) {
        throw new Error("You must specify a Discord client public key");
      }
      return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const timestamp = req.header("X-Signature-Timestamp") || "";
        const signature = req.header("X-Signature-Ed25519") || "";
        if (!timestamp || !signature) {
          res.statusCode = 401;
          res.end("[discord-interactions] Invalid signature");
          return;
        }
        function onBodyComplete(rawBody) {
          return __awaiter(this, void 0, void 0, function* () {
            const isValid = yield verifyKey2(rawBody, signature, timestamp, clientPublicKey);
            if (!isValid) {
              res.statusCode = 401;
              res.end("[discord-interactions] Invalid signature");
              return;
            }
            const body = JSON.parse(rawBody.toString("utf-8")) || {};
            if (body.type === InteractionType2.PING) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                type: InteractionResponseType4.PONG
              }));
              return;
            }
            req.body = body;
            next();
          });
        }
        __name(onBodyComplete, "onBodyComplete");
        if (req.body) {
          if (Buffer.isBuffer(req.body)) {
            yield onBodyComplete(req.body);
          } else if (typeof req.body === "string") {
            yield onBodyComplete(Buffer.from(req.body, "utf-8"));
          } else {
            console.warn("[discord-interactions]: req.body was tampered with, probably by some other middleware. We recommend disabling middleware for interaction routes so that req.body is a raw buffer.");
            yield onBodyComplete(Buffer.from(JSON.stringify(req.body), "utf-8"));
          }
        } else {
          const chunks = [];
          req.on("data", (chunk) => {
            chunks.push(chunk);
          });
          req.on("end", () => __awaiter(this, void 0, void 0, function* () {
            const rawBody = Buffer.concat(chunks);
            yield onBodyComplete(rawBody);
          }));
        }
      });
    }
    __name(verifyKeyMiddleware, "verifyKeyMiddleware");
    exports.verifyKeyMiddleware = verifyKeyMiddleware;
    __exportStar(require_components(), exports);
    __exportStar(require_webhooks(), exports);
  }
});

// .wrangler/tmp/bundle-jLdUh1/middleware-loader.entry.ts
init_checked_fetch();
init_modules_watch_stub();

// .wrangler/tmp/bundle-jLdUh1/middleware-insertion-facade.js
init_checked_fetch();
init_modules_watch_stub();

// src/index.js
init_checked_fetch();
init_modules_watch_stub();
var import_discord_interactions3 = __toESM(require_dist());
var import_discord_interactions4 = __toESM(require_dist());

// node_modules/itty-router/index.mjs
init_checked_fetch();
init_modules_watch_stub();
var t = /* @__PURE__ */ __name(({ base: e = "", routes: t2 = [], ...r2 } = {}) => ({ __proto__: new Proxy({}, { get: /* @__PURE__ */ __name((r3, o2, a, s) => (r4, ...c) => t2.push([o2.toUpperCase?.(), RegExp(`^${(s = (e + r4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), c, s]) && a, "get") }), routes: t2, ...r2, async fetch(e2, ...o2) {
  let a, s, c = new URL(e2.url), n = e2.query = { __proto__: null };
  for (let [e3, t3] of c.searchParams) n[e3] = n[e3] ? [].concat(n[e3], t3) : t3;
  e: try {
    for (let t3 of r2.before || []) if (null != (a = await t3(e2.proxy ?? e2, ...o2))) break e;
    t: for (let [r3, n2, l, i] of t2) if ((r3 == e2.method || "ALL" == r3) && (s = c.pathname.match(n2))) {
      e2.params = s.groups || {}, e2.route = i;
      for (let t3 of l) if (null != (a = await t3(e2.proxy ?? e2, ...o2))) break t;
    }
  } catch (t3) {
    if (!r2.catch) throw t3;
    a = await r2.catch(t3, e2.proxy ?? e2, ...o2);
  }
  try {
    for (let t3 of r2.finally || []) a = await t3(a, e2.proxy ?? e2, ...o2) ?? a;
  } catch (t3) {
    if (!r2.catch) throw t3;
    a = await r2.catch(t3, e2.proxy ?? e2, ...o2);
  }
  return a;
} }), "t");
var r = /* @__PURE__ */ __name((e = "text/plain; charset=utf-8", t2) => (r2, o2 = {}) => {
  if (void 0 === r2 || r2 instanceof Response) return r2;
  const a = new Response(t2?.(r2) ?? r2, o2.url ? void 0 : o2);
  return a.headers.set("content-type", e), a;
}, "r");
var o = r("application/json; charset=utf-8", JSON.stringify);
var p = r("text/plain; charset=utf-8", String);
var f = r("text/html");
var u = r("image/jpeg");
var h = r("image/png");
var g = r("image/webp");

// src/commands/poll.js
init_checked_fetch();
init_modules_watch_stub();
var import_discord_interactions = __toESM(require_dist());

// src/services/pollManager.js
init_checked_fetch();
init_modules_watch_stub();

// src/utils/chrisStyle.js
init_checked_fetch();
init_modules_watch_stub();
function calculateChrisStyleWinner(candidates, votes) {
  const scores = {};
  candidates.forEach((candidate, index) => {
    scores[index] = {
      nomination: candidate,
      points: 0
    };
  });
  votes.forEach((vote) => {
    vote.rankings.forEach((bookIndex, position) => {
      const candidateIndex = bookIndex - 1;
      if (scores[candidateIndex]) {
        const points = Math.max(0, 3 - position);
        scores[candidateIndex].points += points;
      }
    });
  });
  const sortedResults = Object.values(scores).sort((a, b) => b.points - a.points);
  return {
    winner: sortedResults[0]?.nomination || null,
    standings: sortedResults,
    totalVotes: votes.length
  };
}
__name(calculateChrisStyleWinner, "calculateChrisStyleWinner");

// src/utils/rankedChoice.js
init_checked_fetch();
init_modules_watch_stub();
function calculateRankedChoiceWinner(candidates, votes) {
  if (candidates.length === 0) {
    return { winner: null, rounds: [], totalVotes: votes.length };
  }
  if (candidates.length === 1) {
    return {
      winner: candidates[0],
      rounds: [{ eliminated: null, votes: { [0]: votes.length } }],
      totalVotes: votes.length
    };
  }
  let remainingCandidates = [...candidates];
  let currentVotes = votes.map((vote) => ({ ...vote }));
  const rounds = [];
  while (remainingCandidates.length > 1) {
    const voteCounts = {};
    remainingCandidates.forEach((_, index) => {
      voteCounts[index] = 0;
    });
    currentVotes.forEach((vote) => {
      for (const ranking of vote.rankings) {
        const candidateIndex = ranking - 1;
        if (remainingCandidates[candidateIndex]) {
          voteCounts[candidateIndex]++;
          break;
        }
      }
    });
    const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
    const majority = Math.floor(totalVotes / 2) + 1;
    for (const [index, count] of Object.entries(voteCounts)) {
      if (count >= majority) {
        rounds.push({ eliminated: null, votes: voteCounts });
        return {
          winner: remainingCandidates[index],
          rounds,
          totalVotes: votes.length
        };
      }
    }
    let minVotes = Infinity;
    let eliminateIndex = -1;
    for (const [index, count] of Object.entries(voteCounts)) {
      if (count < minVotes) {
        minVotes = count;
        eliminateIndex = parseInt(index);
      }
    }
    rounds.push({
      eliminated: remainingCandidates[eliminateIndex],
      votes: { ...voteCounts }
    });
    remainingCandidates.splice(eliminateIndex, 1);
    currentVotes.forEach((vote) => {
      vote.rankings = vote.rankings.filter(
        (ranking) => remainingCandidates[ranking - 1] !== void 0
      );
    });
  }
  return {
    winner: remainingCandidates[0] || null,
    rounds,
    totalVotes: votes.length
  };
}
__name(calculateRankedChoiceWinner, "calculateRankedChoiceWinner");

// src/services/pollManager.js
var PollManager = class {
  static {
    __name(this, "PollManager");
  }
  constructor(env) {
    this.env = env;
    this.db = env.POLLS_DB;
  }
  generatePollId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  async createPoll(pollData) {
    const pollId = this.generatePollId();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await this.db.prepare(`
                INSERT INTO polls (
                    id, title, guild_id, channel_id, creator_id, 
                    phase, tally_method, nomination_deadline, voting_deadline, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
        pollId,
        pollData.title,
        pollData.guildId,
        pollData.channelId,
        pollData.creatorId,
        "nomination",
        pollData.tallyMethod || "ranked-choice",
        pollData.nominationDeadline,
        pollData.votingDeadline,
        now,
        now
      ).run();
      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  }
  async getPoll(pollId) {
    try {
      const pollResult = await this.db.prepare(`
                SELECT * FROM polls WHERE id = ?
            `).bind(pollId).first();
      if (!pollResult) {
        return null;
      }
      const nominationsQuery = this.db.prepare(`
                SELECT * FROM nominations WHERE poll_id = ? ORDER BY created_at ASC LIMIT 50
            `).bind(pollId);
      const votesQuery = this.db.prepare(`
                SELECT * FROM votes WHERE poll_id = ? ORDER BY created_at ASC LIMIT 100
            `).bind(pollId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database timeout")), 5e3);
      });
      const queryPromise = Promise.all([
        nominationsQuery.all(),
        votesQuery.all()
      ]);
      const [nominationsResult, votesResult] = await Promise.race([
        queryPromise,
        timeoutPromise
      ]);
      const poll = {
        id: pollResult.id,
        title: pollResult.title,
        guildId: pollResult.guild_id,
        channelId: pollResult.channel_id,
        creatorId: pollResult.creator_id,
        phase: pollResult.phase,
        tallyMethod: pollResult.tally_method,
        nominationDeadline: pollResult.nomination_deadline,
        votingDeadline: pollResult.voting_deadline,
        createdAt: pollResult.created_at,
        updatedAt: pollResult.updated_at,
        nominations: [],
        votes: [],
        results: null
      };
      if (nominationsResult?.results) {
        poll.nominations = nominationsResult.results.map((n) => ({
          title: n.title,
          author: n.author,
          link: n.link,
          userId: n.user_id,
          username: n.username,
          timestamp: n.created_at
        }));
      }
      if (votesResult?.results) {
        poll.votes = votesResult.results.map((v) => {
          try {
            return {
              userId: v.user_id,
              rankings: JSON.parse(v.rankings || "[]"),
              timestamp: v.created_at
            };
          } catch (parseError) {
            console.error("Error parsing vote rankings:", parseError);
            return {
              userId: v.user_id,
              rankings: [],
              timestamp: v.created_at
            };
          }
        });
      }
      if (poll.phase === "completed" && poll.votes.length < 100) {
        try {
          poll.results = this.calculateResults(poll);
        } catch (resultError) {
          console.error("Error calculating results:", resultError);
          poll.results = null;
        }
      }
      return poll;
    } catch (error) {
      console.error("Error getting poll:", error);
      if (error.message === "Database timeout") {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    }
  }
  async getAllPolls(guildId) {
    try {
      const pollsResult = await this.db.prepare(`
                SELECT * FROM polls WHERE guild_id = ? ORDER BY created_at DESC LIMIT 20
            `).bind(guildId).all();
      if (!pollsResult?.results) return [];
      return pollsResult.results.map((pollRow) => ({
        id: pollRow.id,
        title: pollRow.title,
        guildId: pollRow.guild_id,
        channelId: pollRow.channel_id,
        creatorId: pollRow.creator_id,
        phase: pollRow.phase,
        tallyMethod: pollRow.tally_method,
        nominationDeadline: pollRow.nomination_deadline,
        votingDeadline: pollRow.voting_deadline,
        createdAt: pollRow.created_at,
        updatedAt: pollRow.updated_at
      }));
    } catch (error) {
      console.error("Error getting polls:", error);
      return [];
    }
  }
  async updatePoll(pollId, updates) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const setParts = [];
    const bindings = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbColumn = this.convertFieldToColumn(key);
      setParts.push(`${dbColumn} = ?`);
      if (key === "results") {
        bindings.push(JSON.stringify(value));
      } else {
        bindings.push(value);
      }
    }
    setParts.push("updated_at = ?");
    bindings.push(now);
    bindings.push(pollId);
    await this.db.prepare(`
            UPDATE polls SET ${setParts.join(", ")} WHERE id = ?
        `).bind(...bindings).run();
  }
  convertFieldToColumn(field) {
    const fieldMap = {
      "phase": "phase",
      "results": "results_data",
      "tallyMethod": "tally_method"
    };
    return fieldMap[field] || field;
  }
  async nominateBook(pollId, nomination) {
    try {
      const existingNomination = await this.db.prepare(`
                SELECT id FROM nominations WHERE poll_id = ? AND user_id = ?
            `).bind(pollId, nomination.userId).first();
      if (existingNomination) {
        throw new Error("You have already nominated a book for this poll");
      }
      await this.db.prepare(`
                INSERT INTO nominations (poll_id, title, author, link, user_id, username)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
        pollId,
        nomination.title,
        nomination.author || null,
        nomination.link || null,
        nomination.userId,
        nomination.username
      ).run();
      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error nominating book:", error);
      throw error;
    }
  }
  async removeUserNomination(pollId, userId) {
    try {
      await this.db.prepare(`
                DELETE FROM nominations WHERE poll_id = ? AND user_id = ?
            `).bind(pollId, userId).run();
      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error removing nomination:", error);
      throw error;
    }
  }
  async submitVote(pollId, userId, rankings) {
    try {
      const existingVote = await this.db.prepare(`
                SELECT id FROM votes WHERE poll_id = ? AND user_id = ?
            `).bind(pollId, userId).first();
      if (existingVote) {
        throw new Error("You have already voted in this poll");
      }
      await this.db.prepare(`
                INSERT INTO votes (poll_id, user_id, rankings)
                VALUES (?, ?, ?)
            `).bind(pollId, userId, JSON.stringify(rankings)).run();
      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error submitting vote:", error);
      throw error;
    }
  }
  async updatePollPhase(pollId, newPhase) {
    try {
      if (newPhase === "completed") {
        const poll = await this.getPoll(pollId);
        if (poll && poll.nominations.length > 0) {
          const results = this.calculateResults(poll);
          await this.updatePoll(pollId, { phase: newPhase, results });
        } else {
          await this.updatePoll(pollId, { phase: newPhase });
        }
      } else {
        await this.updatePoll(pollId, { phase: newPhase });
      }
      return await this.getPoll(pollId);
    } catch (error) {
      console.error("Error updating poll phase:", error);
      throw error;
    }
  }
  calculateResults(poll) {
    if (poll.tallyMethod === "chris-style") {
      return this.calculateChrisStyleResults(poll);
    } else {
      return this.calculateRankedChoiceResults(poll);
    }
  }
  calculateChrisStyleResults(poll) {
    try {
      return calculateChrisStyleWinner(poll.nominations, poll.votes);
    } catch (error) {
      console.error("Error calculating Chris-style results:", error);
      return { winner: null, standings: [], totalVotes: 0 };
    }
  }
  calculateRankedChoiceResults(poll) {
    try {
      return calculateRankedChoiceWinner(poll.nominations, poll.votes);
    } catch (error) {
      console.error("Error calculating ranked choice results:", error);
      return { winner: null, rounds: [], totalVotes: 0 };
    }
  }
  async checkIfAllVoted(pollId) {
    return await this.getPoll(pollId);
  }
  async getActivePolls() {
    try {
      const result = await this.db.prepare(`
                SELECT * FROM polls WHERE phase IN ('nomination', 'voting') ORDER BY created_at DESC LIMIT 10
            `).all();
      if (!result?.results) return [];
      return result.results.map((row) => ({
        id: row.id,
        title: row.title,
        guildId: row.guild_id,
        channelId: row.channel_id,
        phase: row.phase,
        nominationDeadline: row.nomination_deadline,
        votingDeadline: row.voting_deadline
      }));
    } catch (error) {
      console.error("Error getting active polls:", error);
      return [];
    }
  }
  async getSingleActivePoll(guildId) {
    try {
      const result = await this.db.prepare(`
                SELECT * FROM polls WHERE guild_id = ? AND phase IN ('nomination', 'voting') 
                ORDER BY created_at DESC LIMIT 1
            `).bind(guildId).first();
      if (!result) return null;
      return {
        id: result.id,
        title: result.title,
        phase: result.phase
      };
    } catch (error) {
      console.error("Error getting single active poll:", error);
      return null;
    }
  }
  // Voting session management for chris-style voting
  async getVotingSession(userKey) {
    try {
      const result = await this.db.prepare(`
                SELECT * FROM voting_sessions WHERE user_key = ? AND expires_at > datetime('now')
            `).bind(userKey).first();
      if (!result) return null;
      return {
        pollId: result.poll_id,
        userId: result.user_id,
        selections: JSON.parse(result.selections || "[]")
      };
    } catch (error) {
      console.error("Error getting voting session:", error);
      return null;
    }
  }
  async setVotingSession(userKey, pollId, userId, selections) {
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
      await this.db.prepare(`
                INSERT OR REPLACE INTO voting_sessions (user_key, poll_id, user_id, selections, expires_at)
                VALUES (?, ?, ?, ?, ?)
            `).bind(userKey, pollId, userId, JSON.stringify(selections), expiresAt).run();
    } catch (error) {
      console.error("Error setting voting session:", error);
    }
  }
  async deleteVotingSession(userKey) {
    try {
      await this.db.prepare(`
                DELETE FROM voting_sessions WHERE user_key = ?
            `).bind(userKey).run();
    } catch (error) {
      console.error("Error deleting voting session:", error);
    }
  }
};

// src/commands/poll.js
var pollCommand = {
  data: {
    name: "poll",
    description: "Manage book polls",
    options: [
      {
        name: "create",
        description: "Create a new book poll",
        type: 1,
        // SUB_COMMAND
        options: [
          {
            name: "title",
            description: "Poll title",
            type: 3,
            // STRING
            required: true
          },
          {
            name: "nomination_hours",
            description: "Hours for nomination phase",
            type: 4,
            // INTEGER
            required: true
          },
          {
            name: "voting_hours",
            description: "Hours for voting phase",
            type: 4,
            // INTEGER
            required: true
          },
          {
            name: "tally_method",
            description: "Voting method",
            type: 3,
            // STRING
            required: false,
            choices: [
              { name: "Ranked Choice (rank all books)", value: "ranked-choice" },
              { name: "Chris Style (top 3 picks)", value: "chris-style" }
            ]
          }
        ]
      },
      {
        name: "status",
        description: "Check poll status",
        type: 1,
        // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description: "Poll ID (optional - will auto-detect if not provided)",
            type: 3,
            // STRING
            required: false
          }
        ]
      },
      {
        name: "nominate",
        description: "Nominate a book",
        type: 1,
        // SUB_COMMAND
        options: [
          {
            name: "title",
            description: "Book title",
            type: 3,
            // STRING
            required: true
          },
          {
            name: "author",
            description: "Book author",
            type: 3,
            // STRING
            required: false
          },
          {
            name: "link",
            description: "Link to book",
            type: 3,
            // STRING
            required: false
          },
          {
            name: "poll_id",
            description: "Poll ID (optional - will auto-detect if not provided)",
            type: 3,
            // STRING
            required: false
          }
        ]
      },
      {
        name: "list",
        description: "List all polls",
        type: 1
        // SUB_COMMAND
      },
      {
        name: "end-nominations",
        description: "End nomination phase early",
        type: 1,
        // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description: "Poll ID (optional - will auto-detect if not provided)",
            type: 3,
            // STRING
            required: false
          }
        ]
      },
      {
        name: "end-voting",
        description: "End voting phase early",
        type: 1,
        // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description: "Poll ID (optional - will auto-detect if not provided)",
            type: 3,
            // STRING
            required: false
          }
        ]
      }
    ]
  },
  async execute(interaction, env) {
    const subcommand = interaction.data.options?.[0]?.name;
    const options = interaction.data.options?.[0]?.options || [];
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Command timeout")), 8e3);
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
            return await this.handleEndNominations(interaction, options, pollManager);
          case "end-voting":
            return await this.handleEndVoting(interaction, options, pollManager);
          default:
            return new Response(JSON.stringify({
              type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "Unknown subcommand",
                flags: 64
                // Ephemeral
              }
            }), {
              headers: { "Content-Type": "application/json" }
            });
        }
      })();
      return await Promise.race([commandPromise, timeoutPromise]);
    } catch (error) {
      console.error("Error executing poll command:", error);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: error.message === "Command timeout" ? "Request timed out. Please try again." : `Error: ${error.message}`,
          flags: 64
          // Ephemeral
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  async handleCreate(interaction, options, pollManager) {
    try {
      const title = options.find((opt) => opt.name === "title")?.value;
      const nominationHours = options.find((opt) => opt.name === "nomination_hours")?.value;
      const votingHours = options.find((opt) => opt.name === "voting_hours")?.value;
      const tallyMethod = options.find((opt) => opt.name === "tally_method")?.value || "ranked-choice";
      if (!title || !nominationHours || !votingHours) {
        throw new Error("Missing required parameters");
      }
      const now = /* @__PURE__ */ new Date();
      const nominationDeadline = new Date(now.getTime() + nominationHours * 60 * 60 * 1e3);
      const votingDeadline = new Date(nominationDeadline.getTime() + votingHours * 60 * 60 * 1e3);
      const pollData = {
        title,
        guildId: interaction.guild_id,
        channelId: interaction.channel_id,
        creatorId: interaction.member?.user?.id || interaction.user?.id,
        nominationDeadline: nominationDeadline.toISOString(),
        votingDeadline: votingDeadline.toISOString(),
        tallyMethod
      };
      const poll = await pollManager.createPoll(pollData);
      if (!poll) {
        throw new Error("Failed to create poll");
      }
      const embed = {
        title: "\u{1F4DA} New Book Poll Created!",
        description: `**${poll.title}**`,
        color: 39423,
        fields: [
          {
            name: "\u{1F4DD} Current Phase",
            value: "Nomination",
            inline: true
          },
          {
            name: "\u{1F4CA} Tally Method",
            value: tallyMethod === "chris-style" ? "Chris Style" : "Ranked Choice",
            inline: true
          },
          {
            name: "\u23F0 Nomination Deadline",
            value: `<t:${Math.floor(nominationDeadline.getTime() / 1e3)}:F>`,
            inline: false
          },
          {
            name: "\u{1F5F3}\uFE0F Voting Deadline",
            value: `<t:${Math.floor(votingDeadline.getTime() / 1e3)}:F>`,
            inline: false
          }
        ],
        footer: { text: `Poll ID: ${poll.id}` },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [embed]
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating poll:", error);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Error creating poll: ${error.message}`,
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  async handleStatus(interaction, options, pollManager) {
    try {
      let pollId = options.find((opt) => opt.name === "poll_id")?.value;
      if (!pollId) {
        const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
        if (activePoll) {
          pollId = activePoll.id;
        } else {
          return new Response(JSON.stringify({
            type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "No active polls found. Please specify a poll ID.",
              flags: 64
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      const poll = await pollManager.getPoll(pollId);
      if (!poll) {
        return new Response(JSON.stringify({
          type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Poll not found.",
            flags: 64
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      const embed = this.createStatusEmbed(poll);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [embed]
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting poll status:", error);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Error getting status: ${error.message}`,
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  async handleNominate(interaction, options, pollManager) {
    try {
      const title = options.find((opt) => opt.name === "title")?.value;
      const author = options.find((opt) => opt.name === "author")?.value;
      const link = options.find((opt) => opt.name === "link")?.value;
      let pollId = options.find((opt) => opt.name === "poll_id")?.value;
      if (!pollId) {
        const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
        if (activePoll && activePoll.phase === "nomination") {
          pollId = activePoll.id;
        } else {
          return new Response(JSON.stringify({
            type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "No active nomination phase found. Please specify a poll ID.",
              flags: 64
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      const nomination = {
        title,
        author,
        link,
        userId: interaction.member?.user?.id || interaction.user?.id,
        username: interaction.member?.user?.username || interaction.user?.username
      };
      await pollManager.nominateBook(pollId, nomination);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `\u2705 Successfully nominated "${title}" ${author ? `by ${author}` : ""}!`,
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error nominating book:", error);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Error: ${error.message}`,
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  async handleList(interaction, pollManager) {
    try {
      const polls = await pollManager.getAllPolls(interaction.guild_id);
      if (polls.length === 0) {
        return new Response(JSON.stringify({
          type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "\u{1F4DA} No polls found in this server.",
            flags: 64
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      const pollList = polls.map(
        (poll) => `\`${poll.id}\` - **${poll.title}** (${poll.phase}) - <t:${Math.floor(new Date(poll.createdAt).getTime() / 1e3)}:R>`
      ).join("\n");
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
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
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing polls:", error);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Error listing polls: ${error.message}`,
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  async handleEndNominations(interaction, options, pollManager) {
    try {
      let pollId = options.find((opt) => opt.name === "poll_id")?.value;
      if (!pollId) {
        const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
        if (activePoll && activePoll.phase === "nomination") {
          pollId = activePoll.id;
        } else {
          return new Response(JSON.stringify({
            type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "No active nomination phase found.",
              flags: 64
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      await pollManager.updatePollPhase(pollId, "voting");
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "\u2705 Nomination phase ended. Voting phase has begun!",
          components: [{
            type: 1,
            // Action Row
            components: [{
              type: 2,
              // Button
              style: 1,
              // Primary
              label: "\u{1F5F3}\uFE0F Vote Now",
              custom_id: `vote_${pollId}`
            }]
          }]
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error ending nominations:", error);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Error: ${error.message}`,
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  async handleEndVoting(interaction, options, pollManager) {
    try {
      let pollId = options.find((opt) => opt.name === "poll_id")?.value;
      if (!pollId) {
        const activePoll = await pollManager.getSingleActivePoll(interaction.guild_id);
        if (activePoll && activePoll.phase === "voting") {
          pollId = activePoll.id;
        } else {
          return new Response(JSON.stringify({
            type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "No active voting phase found.",
              flags: 64
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      const completedPoll = await pollManager.updatePollPhase(pollId, "completed");
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "\u2705 Voting phase ended. Poll completed!",
          embeds: [this.createStatusEmbed(completedPoll)]
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error ending voting:", error);
      return new Response(JSON.stringify({
        type: import_discord_interactions.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Error: ${error.message}`,
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  createStatusEmbed(poll) {
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
    if (poll.phase === "voting") {
      embed.fields.push({
        name: "\u{1F5F3}\uFE0F Votes Cast",
        value: poll.votes.length.toString(),
        inline: true
      });
    }
    if (poll.phase === "completed" && poll.results) {
      const results = poll.results;
      if (results.winner) {
        embed.fields.push({
          name: "\u{1F3C6} Winner",
          value: `**${results.winner.title}** ${results.winner.author ? `by ${results.winner.author}` : ""}`,
          inline: false
        });
      }
    }
    return embed;
  }
};

// src/interactions/handlers.js
init_checked_fetch();
init_modules_watch_stub();
var import_discord_interactions2 = __toESM(require_dist());
async function handleButtonInteraction(interaction, env) {
  if (interaction.data.custom_id.startsWith("vote_")) {
    const pollId = interaction.data.custom_id.replace("vote_", "");
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Handler timeout")), 8e3);
      });
      const handlerPromise = (async () => {
        const pollManager = new PollManager(env);
        const poll = await pollManager.getPoll(pollId);
        if (!poll) {
          return new Response(JSON.stringify({
            type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "Poll not found!",
              flags: 64
              // Ephemeral
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        if (poll.phase !== "voting") {
          return new Response(JSON.stringify({
            type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `This poll is currently in the ${poll.phase} phase. Voting is not available yet.`,
              flags: 64
              // Ephemeral
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const existingVote = await pollManager.db.prepare(`
                    SELECT id FROM votes WHERE poll_id = ? AND user_id = ?
                `).bind(pollId, userId).first();
        if (existingVote) {
          return new Response(JSON.stringify({
            type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "You have already voted in this poll!",
              flags: 64
              // Ephemeral
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        if (poll.tallyMethod === "chris-style") {
          return generateChrisStyleVotingInterface(poll, userId);
        } else {
          return generateRankedChoiceVotingInterface(poll);
        }
      })();
      return await Promise.race([handlerPromise, timeoutPromise]);
    } catch (error) {
      console.error("Error handling vote button:", error);
      return new Response(JSON.stringify({
        type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: error.message === "Handler timeout" ? "Request timed out. Please try again." : "An error occurred. Please try again.",
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response(JSON.stringify({
    type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Unknown button interaction",
      flags: 64
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleButtonInteraction, "handleButtonInteraction");
async function handleSelectMenuInteraction(interaction, env) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Handler timeout")), 8e3);
    });
    const handlerPromise = (async () => {
      const pollManager = new PollManager(env);
      const customId = interaction.data.custom_id;
      if (customId.startsWith("chris_vote_")) {
        return await handleChrisStyleVoting(interaction, env, pollManager);
      }
      return new Response(JSON.stringify({
        type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Unknown select menu interaction",
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    })();
    return await Promise.race([handlerPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error handling select menu:", error);
    return new Response(JSON.stringify({
      type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: error.message === "Handler timeout" ? "Request timed out. Please try again." : "An error occurred. Please try again.",
        flags: 64
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleSelectMenuInteraction, "handleSelectMenuInteraction");
async function handleModalSubmit(interaction, env) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Handler timeout")), 8e3);
    });
    const handlerPromise = (async () => {
      const pollManager = new PollManager(env);
      if (interaction.data.custom_id.startsWith("ranked_vote_")) {
        return await handleRankedChoiceSubmission(interaction, env, pollManager);
      }
      return new Response(JSON.stringify({
        type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Unknown modal submission",
          flags: 64
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    })();
    return await Promise.race([handlerPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error handling modal submit:", error);
    return new Response(JSON.stringify({
      type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: error.message === "Handler timeout" ? "Request timed out. Please try again." : "An error occurred. Please try again.",
        flags: 64
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleModalSubmit, "handleModalSubmit");
async function handleChrisStyleVoting(interaction, env, pollManager) {
  const customId = interaction.data.custom_id;
  const parts = customId.split("_");
  const position = parts[2];
  const pollId = parts[3];
  const selectedValue = interaction.data.values[0];
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const userKey = `${userId}_${pollId}`;
  let session = await pollManager.getVotingSession(userKey);
  if (!session) {
    session = {
      pollId,
      userId,
      selections: []
    };
  }
  const existingIndex = session.selections.findIndex((s) => s.position === position);
  if (existingIndex >= 0) {
    session.selections[existingIndex].bookIndex = parseInt(selectedValue);
  } else {
    session.selections.push({
      position,
      bookIndex: parseInt(selectedValue)
    });
  }
  await pollManager.setVotingSession(userKey, pollId, userId, session.selections);
  const poll = await pollManager.getPoll(pollId);
  const requiredSelections = Math.min(3, poll.nominations.length);
  const hasAllSelections = session.selections.length >= requiredSelections;
  if (hasAllSelections) {
    const rankings = session.selections.sort((a, b) => {
      const order = { first: 0, second: 1, third: 2 };
      return order[a.position] - order[b.position];
    }).map((s) => s.bookIndex);
    await pollManager.submitVote(pollId, userId, rankings);
    await pollManager.deleteVotingSession(userKey);
    return new Response(JSON.stringify({
      type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "\u2705 Your vote has been submitted successfully!",
        flags: 64
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  return generateChrisStyleVotingInterface(poll, userId, session.selections);
}
__name(handleChrisStyleVoting, "handleChrisStyleVoting");
async function handleRankedChoiceSubmission(interaction, env, pollManager) {
  const pollId = interaction.data.custom_id.replace("ranked_vote_", "");
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const rankingsInput = interaction.data.components[0].components[0].value;
  const rankings = rankingsInput.split(",").map((num) => parseInt(num.trim())).filter((num) => !isNaN(num));
  await pollManager.submitVote(pollId, userId, rankings);
  return new Response(JSON.stringify({
    type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "\u2705 Your vote has been submitted successfully!",
      flags: 64
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleRankedChoiceSubmission, "handleRankedChoiceSubmission");
function generateChrisStyleVotingInterface(poll, userId, existingSelections = []) {
  const components = [];
  const nominations = poll.nominations;
  const maxSelections = Math.min(3, nominations.length);
  const positions = ["first", "second", "third"].slice(0, maxSelections);
  positions.forEach((position, index) => {
    const currentSelection = existingSelections.find((s) => s.position === position);
    const options = nominations.map((nom, idx) => ({
      label: nom.title.substring(0, 100),
      value: (idx + 1).toString(),
      description: nom.author ? `by ${nom.author}`.substring(0, 100) : void 0,
      default: currentSelection?.bookIndex === idx + 1
    }));
    components.push({
      type: 1,
      // Action Row
      components: [{
        type: 3,
        // Select Menu
        custom_id: `chris_vote_${position}_${poll.id}`,
        placeholder: `Select your ${position} choice`,
        options
      }]
    });
  });
  const selectedCount = existingSelections.length;
  const statusText = selectedCount > 0 ? `Selected ${selectedCount}/${maxSelections} choices` : "Make your selections below";
  return new Response(JSON.stringify({
    type: import_discord_interactions2.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `\u{1F4CA} **Chris-Style Voting** - ${poll.title}

${statusText}`,
      components,
      flags: 64
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(generateChrisStyleVotingInterface, "generateChrisStyleVotingInterface");
function generateRankedChoiceVotingInterface(poll) {
  const nominations = poll.nominations;
  const nominationsList = nominations.map(
    (nom, idx) => `${idx + 1}. **${nom.title}** ${nom.author ? `by ${nom.author}` : ""}`
  ).join("\n");
  return new Response(JSON.stringify({
    type: import_discord_interactions2.InteractionResponseType.MODAL,
    data: {
      title: "Ranked Choice Voting",
      custom_id: `ranked_vote_${poll.id}`,
      components: [{
        type: 1,
        // Action Row
        components: [{
          type: 4,
          // Text Input
          custom_id: "rankings",
          label: "Enter your rankings (comma-separated numbers)",
          style: 2,
          // Paragraph
          placeholder: "Example: 3,1,2 (ranks book 3 first, book 1 second, book 2 third)",
          required: true,
          max_length: 100
        }]
      }]
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(generateRankedChoiceVotingInterface, "generateRankedChoiceVotingInterface");

// src/services/scheduler.js
init_checked_fetch();
init_modules_watch_stub();
async function checkPollPhases(env) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Scheduler timeout")), 2e4);
    });
    const schedulerPromise = (async () => {
      const pollManager = new PollManager(env);
      const activePolls = await pollManager.db.prepare(`
                SELECT id, phase, nomination_deadline, voting_deadline, channel_id, guild_id, title, tally_method
                FROM polls 
                WHERE phase IN ('nomination', 'voting') 
                LIMIT 10
            `).all();
      const polls = activePolls.results || [];
      console.log(`Checking ${polls.length} active polls`);
      const now = /* @__PURE__ */ new Date();
      for (const poll of polls) {
        try {
          const nominationDeadline = new Date(poll.nomination_deadline);
          const votingDeadline = new Date(poll.voting_deadline);
          if (poll.phase === "nomination" && now >= nominationDeadline) {
            console.log(`Ending nomination phase for poll ${poll.id}`);
            await pollManager.updatePollPhase(poll.id, "voting");
            const fullPoll = await pollManager.getPoll(poll.id);
            if (fullPoll) {
              await announceVotingPhase(fullPoll, env);
            }
          } else if (poll.phase === "voting" && now >= votingDeadline) {
            console.log(`Ending voting phase for poll ${poll.id}`);
            await pollManager.updatePollPhase(poll.id, "completed");
            const fullPoll = await pollManager.getPoll(poll.id);
            if (fullPoll) {
              await announcePollCompletion(fullPoll, env);
            }
          }
        } catch (pollError) {
          console.error(`Error processing poll ${poll.id}:`, pollError);
        }
      }
    })();
    await Promise.race([schedulerPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error checking poll phases:", error);
    if (error.message === "Scheduler timeout") {
      console.error("Scheduler timed out - skipping this cycle");
    }
  }
}
__name(checkPollPhases, "checkPollPhases");
async function announceVotingPhase(poll, env) {
  try {
    const embed = {
      title: "\u{1F5F3}\uFE0F Voting Phase Started!",
      description: `**${poll.title}**

Nomination phase has ended. Voting is now open!`,
      color: 16755200,
      fields: [
        {
          name: "\u{1F4DA} Nominated Books",
          value: poll.nominations.map(
            (nom, idx) => `${idx + 1}. **${nom.title}** ${nom.author ? `by ${nom.author}` : ""}`
          ).join("\n") || "No nominations",
          inline: false
        },
        {
          name: "\u{1F4CA} Voting Method",
          value: poll.tallyMethod === "chris-style" ? "Chris Style (Top 3 Points)" : "Ranked Choice (IRV)",
          inline: true
        },
        {
          name: "\u23F0 Voting Deadline",
          value: `<t:${Math.floor(new Date(poll.votingDeadline).getTime() / 1e3)}:F>`,
          inline: true
        }
      ],
      footer: { text: `Poll ID: ${poll.id}` }
    };
    const components = [{
      type: 1,
      // Action Row
      components: [{
        type: 2,
        // Button
        style: 1,
        // Primary
        label: "\u{1F5F3}\uFE0F Vote Now",
        custom_id: `vote_${poll.id}`
      }]
    }];
    await sendDiscordMessage(poll.channelId, { embeds: [embed], components }, env);
  } catch (error) {
    console.error("Error announcing voting phase:", error);
  }
}
__name(announceVotingPhase, "announceVotingPhase");
async function announcePollCompletion(poll, env) {
  try {
    if (!poll.results || !poll.results.winner) {
      console.log("Poll completed but no results available");
      return;
    }
    const embed = poll.tallyMethod === "chris-style" ? createChrisStyleResultsEmbed(poll, poll.results) : createRankedChoiceResultsEmbed(poll, poll.results);
    await sendDiscordMessage(poll.channelId, { embeds: [embed] }, env);
  } catch (error) {
    console.error("Error announcing poll completion:", error);
  }
}
__name(announcePollCompletion, "announcePollCompletion");
function createChrisStyleResultsEmbed(poll, results) {
  const sortedBooks = results.allBooks.sort((a, b) => b.points - a.points).slice(0, 10);
  const resultsText = sortedBooks.map((book, idx) => {
    const medal = idx === 0 ? "\u{1F947}" : idx === 1 ? "\u{1F948}" : idx === 2 ? "\u{1F949}" : `${idx + 1}.`;
    return `${medal} **${book.title}** ${book.author ? `by ${book.author}` : ""} - ${book.points} points`;
  }).join("\n");
  return {
    title: "\u{1F3C6} Poll Results - Chris Style",
    description: `**${poll.title}**

${resultsText}`,
    color: 65280,
    fields: [
      {
        name: "\u{1F451} Winner",
        value: `**${results.winner.title}** ${results.winner.author ? `by ${results.winner.author}` : ""} with ${results.winner.points} points!`,
        inline: false
      }
    ],
    footer: { text: `Poll ID: ${poll.id} | ${poll.votes.length} votes cast` },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(createChrisStyleResultsEmbed, "createChrisStyleResultsEmbed");
function createRankedChoiceResultsEmbed(poll, results) {
  const finalStandings = results.finalStandings || [];
  const resultsText = finalStandings.slice(0, 10).map((book, idx) => {
    const medal = idx === 0 ? "\u{1F947}" : idx === 1 ? "\u{1F948}" : idx === 2 ? "\u{1F949}" : `${idx + 1}.`;
    return `${medal} **${book.title}** ${book.author ? `by ${book.author}` : ""}`;
  }).join("\n");
  return {
    title: "\u{1F3C6} Poll Results - Ranked Choice",
    description: `**${poll.title}**

${resultsText}`,
    color: 65280,
    fields: [
      {
        name: "\u{1F451} Winner",
        value: `**${results.winner.title}** ${results.winner.author ? `by ${results.winner.author}` : ""}`,
        inline: false
      },
      {
        name: "\u{1F4CA} Elimination Rounds",
        value: `${results.rounds?.length || 0} rounds`,
        inline: true
      }
    ],
    footer: { text: `Poll ID: ${poll.id} | ${poll.votes.length} votes cast` },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(createRankedChoiceResultsEmbed, "createRankedChoiceResultsEmbed");
async function sendDiscordMessage(channelId, content, env) {
  try {
    if (!env.DISCORD_TOKEN) {
      console.error("Discord token not available");
      return;
    }
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(content)
    });
    if (!response.ok) {
      console.error("Failed to send Discord message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending Discord message:", error);
  }
}
__name(sendDiscordMessage, "sendDiscordMessage");

// src/index.js
var router = t();
router.get("/health", () => {
  return new Response(JSON.stringify({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "discord-book-poll-bot",
    version: "2.0-serverless"
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  });
});
router.post("/interactions", async (request, env) => {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 1e4);
    });
    const handlerPromise = (async () => {
      const signature = request.headers.get("x-signature-ed25519");
      const timestamp = request.headers.get("x-signature-timestamp");
      const body = await request.text();
      const isValidRequest = (0, import_discord_interactions3.verifyKey)(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
      if (!isValidRequest) {
        return new Response("Bad request signature", { status: 401 });
      }
      const interaction = JSON.parse(body);
      if (interaction.type === import_discord_interactions4.InteractionType.PING) {
        return new Response(JSON.stringify({ type: import_discord_interactions4.InteractionResponseType.PONG }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      if (!env.POLLS_DB) {
        console.error("Database not available");
        return new Response(JSON.stringify({
          type: import_discord_interactions4.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Database unavailable. Please try again later.",
            flags: 64
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      if (interaction.type === import_discord_interactions4.InteractionType.APPLICATION_COMMAND) {
        if (interaction.data.name === "poll") {
          return await pollCommand.execute(interaction, env);
        }
      }
      if (interaction.type === import_discord_interactions4.InteractionType.MESSAGE_COMPONENT) {
        if (interaction.data.component_type === 2) {
          return await handleButtonInteraction(interaction, env);
        } else if (interaction.data.component_type === 3) {
          return await handleSelectMenuInteraction(interaction, env);
        }
      }
      if (interaction.type === import_discord_interactions4.InteractionType.MODAL_SUBMIT) {
        return await handleModalSubmit(interaction, env);
      }
      return new Response(JSON.stringify({ error: "Unknown interaction type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    })();
    return await Promise.race([handlerPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error handling interaction:", error);
    if (error.message === "Request timeout") {
      return new Response(JSON.stringify({
        type: import_discord_interactions4.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Request timed out. Please try again.",
          flags: 64
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
async function handleCron(event, env, ctx) {
  console.log("Cron trigger activated");
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Cron timeout")), 25e3);
    });
    const cronPromise = checkPollPhases(env);
    await Promise.race([cronPromise, timeoutPromise]);
    console.log("Cron job completed successfully");
  } catch (error) {
    console.error("Error in cron job:", error);
    if (error.message === "Cron timeout") {
      console.error("Cron job timed out - this may indicate database performance issues");
    }
  }
}
__name(handleCron, "handleCron");
var src_default = {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    return handleCron(event, env, ctx);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_modules_watch_stub();
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
init_checked_fetch();
init_modules_watch_stub();
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

// .wrangler/tmp/bundle-jLdUh1/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_modules_watch_stub();
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

// .wrangler/tmp/bundle-jLdUh1/middleware-loader.entry.ts
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
