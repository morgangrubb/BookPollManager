# AGENTS.md

Serverless Discord book-club poll bot on Cloudflare Workers. JS (ESM), D1 for state, no build step, no Durable Objects.

## Verify

There is **no linter, formatter, typechecker, pre-commit hook, or CI**. Tests are the only gate.

```bash
npx vitest run                              # full suite — 27 files / 150 tests, ~33s
npx vitest run src/interactions/extend.test.js   # one file
npx vitest run -t "should add a vote"       # substring match on test name
```

`npm test` is bare `vitest`, which **watches when a TTY is attached**. In a TTY it will hang your session — prefer `npx vitest run`.

`npm test -- extend.test.js` also works (README documents this form).

## Tests

Vitest with `@cloudflare/vitest-pool-workers` configured against `wrangler.toml` (`vitest.config.js`). Files are colocated: `foo.js` → `foo.test.js` in the same dir.

Despite the workers pool, **tests never touch a real D1 database**. Handlers are called with `vi.fn()`-mocked `pollManager` objects and a fake `env`; `pollManager.test.js` uses a local `createDatabaseMock()` that captures SQL and returns fake `.first()/.all()/.bind()`. So you can add business-logic tests freely, but do not expect to write integration tests against live D1.

No test env vars or fixtures exist. `createResponse` is commonly `vi.mock`ed.

## Adding a `/poll` subcommand

Three files, in order — miss one and the command is dead or unregistered:

1. `src/interactions/<name>.js` — export the Discord command data object and a `handle<Name>` function.
2. `src/interactions/index.js` — add the handler to the `commandHandlers` map (keyed by the kebab-case subcommand name, e.g. `"end-voting"`).
3. `src/commands/poll.js` — add the subcommand definition to the aggregated `/poll` payload.

Then re-register against Discord (step is not automatic on `wrangler deploy` — see below).

## Env vars are split across two mechanisms

- **Worker runtime secrets** → `wrangler secret put <NAME>` (never in `wrangler.toml` or `.env`): `DISCORD_PUBLIC_KEY`, `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `SCORES_PAGE_TOKEN`.
- **Local Node script only** → `.env` via `dotenv`, consumed solely by `src/deploy-commands.js`: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`.

`DISCORD_GUILD_ID` in `.env` makes command registration **guild-scoped** (instant). Without it, registration is global and can take up to an hour to propagate. Both `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` must be set in `.env` or the script exits 1.

`.env.example` mentions `FIREBASE_*` and `.replit` references a pre-serverless Node/postgres setup — both are stale leftovers. Ignore them.

## Deploy

```bash
npm run deploy   # = npm run register-commands && wrangler deploy
```

`wrangler deploy` alone ships code but leaves the Discord command list unchanged.

Toolchain is pinned by `mise.toml` (node 22.16.0, wrangler latest). `mise test`, `mise deploy`, `mise tail` mirror the npm scripts.

## D1 — no migration runner

`wrangler.toml` binds `POLLS_DB` → `discord-polls`. Schema is applied by hand:

```bash
wrangler d1 execute discord-polls --file=./src/schema/init.sql   # base DDL, once
wrangler d1 execute discord-polls --file=./src/schema/migrations/002_add_is_test_to_polls.sql
```

**`wrangler d1 execute` targets the remote database unless you pass `--local`.** Add `--local` when testing locally, or you are writing to production. Migration files in `src/schema/migrations/` are plain `ALTER TABLE` scripts applied manually; nothing replays them, and there is no `d1 migrations apply` flow here.

`init.sql` is a *fresh-install* script and has drifted from `migrations/` — it lacks the `description`/`quote` columns, but `pollManager` inserts into them. Setting up a brand-new DB from `init.sql` alone gives you a schema that fails on poll creation; apply the migrations after it.

Phase transitions (nomination → voting → completed) are driven by the cron trigger `*/5 * * * *` in `wrangler.toml` → `checkPollPhases()` in `src/services/scheduler.js`. There are no Durable Objects; all state is D1.

## Where logic lives

- **All SQL is inline template literals inside `src/services/pollManager.js`** (884 lines, the largest file). One extra raw query lives in `src/services/scheduler.js`. Handlers must not write SQL — add a `PollManager` method.
- `pollManager` snake_case ↔ camelCase mapping is hardcoded (e.g. `isTest: "is_test"`). New columns need entries there *and* in every `SELECT` that maps rows.
- `getPollAndStatus()` (`src/utils/discord/pollHelpers.js`) is the single context builder for all commands; it resolves the poll, `userId`, `isAdmin` (Discord `ADMINISTRATOR` = bit `0x8`), and `isPollCreator`.

### Gotcha: handlers may receive a `Response`, not a context

`getPollAndStatus()` returns an early `createResponse(...)` (a `Response`) when the poll is missing or belongs to another guild. `handlePollCommand` passes that straight into the handler, so the handler reads properties off a `Response` and throws. The dispatcher catches it and shows the generic *"An error occurred while processing your request."* instead of *"❌ Poll not found"*. No handler currently guards for this — so when debugging a vague error message, check this first.

### Out-of-band Discord sends

Any Discord call made *after* the interaction response must go through `runInBackground(ctx, promise)` (`src/utils/backgroundTask.js`), which wraps `ctx.waitUntil` so the Worker isn't killed first. Plain awaits on OOB messages get dropped.

## `is_test` polls

`/poll create test:true` sets `is_test`. Test polls are excluded from `/stats`, `/polls`, `/poll/:id`, and `/polls.csv` (all filter on `is_test = 0`) and are prefixed with 🧪 in Discord output. Use a test poll rather than a real one for manual verification so stats and public pages stay clean.

## HTTP routes

All in `src/index.js`. Public: `/invite`, `/health`, `/polls`, `/poll/:pollId`, `/stats`, `/polls.csv`. `/provisional-scores?token=...` is unlinked and gated by the `SCORES_PAGE_TOKEN` secret — it exposes live standings for the active poll. `/interactions` (POST) is the Discord endpoint.

## Docs

`README.md` (commands + quick start) and `QUICK_START.md` (full command reference) are current. `DEPLOYMENT-*.md`, `ADD_VOTE_EXAMPLES.md`, and `replit.md` are legacy — cross-check against `wrangler.toml` and the code before trusting them. `GEMINI.md` is a stale agent note; this file supersedes it.
