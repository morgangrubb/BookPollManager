// Runs a promise in the background without blocking the interaction response.
//
// Uses ctx.waitUntil() when available so Cloudflare Workers keeps the worker
// alive until the promise settles. Falls back to fire-and-forget when ctx is
// unavailable (e.g. in unit tests, or callers that haven't threaded ctx
// through yet) so callers never throw due to a missing ctx.
export function runInBackground(ctx, promise) {
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(promise);
  } else {
    // Best effort: let it run, but don't let an unhandled rejection surface.
    promise.catch(() => {});
  }
}
