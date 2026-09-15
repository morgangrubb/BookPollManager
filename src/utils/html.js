// Shared helpers for the hidden, token-gated HTML pages (provisional scores,
// stats, etc). Keeps escaping and the page shell consistent across pages.

export function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function pageShell({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #1e1f22; color: #dcddde; max-width: 640px; margin: 40px auto; padding: 0 16px; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.05rem; margin-top: 2rem; color: #b5bac1; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #3a3b3e; }
  th { color: #96989d; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; }
  tr.eliminated { color: #ed4245; }
  .empty { color: #96989d; font-style: italic; }
  .meta { color: #96989d; font-size: 0.9rem; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
