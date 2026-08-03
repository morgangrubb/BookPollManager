// Renders the hidden /provisional-scores page: a live view of standings for
// whichever poll is currently in the nomination or voting phase.

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBookLabel(nomination) {
  if (!nomination) return "Unknown";
  const title = escapeHtml(nomination.title);
  const author = nomination.author
    ? ` by ${escapeHtml(nomination.author)}`
    : "";
  return `${title}${author}`;
}

function pageShell({ title, body }) {
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

function renderChrisStyleStandings(poll) {
  const standings = poll.results?.standings || [];
  if (standings.length === 0) {
    return `<p class="empty">No nominations yet.</p>`;
  }

  const sorted = [...standings].sort(
    (a, b) => (b.points ?? 0) - (a.points ?? 0),
  );

  const rows = sorted
    .map(
      (standing, idx) =>
        `<tr><td>${idx + 1}</td><td>${renderBookLabel(standing.nomination)}</td><td>${standing.points ?? 0}</td></tr>`,
    )
    .join("\n");

  return `<table>
<thead><tr><th>#</th><th>Book</th><th>Points</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

function renderRankedChoiceStandings(poll) {
  const nominations = poll.nominations || [];
  const rounds = poll.results?.rounds || [];

  if (nominations.length === 0) {
    return `<p class="empty">No nominations yet.</p>`;
  }

  if (rounds.length === 0) {
    return `<p class="empty">No votes cast yet.</p>`;
  }

  let currentCandidates = [...nominations];

  const roundsHtml = rounds
    .map((round, roundIdx) => {
      const rows = currentCandidates
        .map((candidate, idx) => {
          const count = round.votes?.[idx] ?? 0;
          const isEliminated =
            round.eliminated && candidate.id === round.eliminated.id;
          return `<tr${isEliminated ? ' class="eliminated"' : ""}><td>${renderBookLabel(candidate)}</td><td>${count}</td><td>${isEliminated ? "Eliminated this round" : ""}</td></tr>`;
        })
        .join("\n");

      const html = `<h2>Round ${roundIdx + 1}</h2>
<table>
<thead><tr><th>Book</th><th>Votes</th><th></th></tr></thead>
<tbody>${rows}</tbody>
</table>`;

      if (round.eliminated) {
        currentCandidates = currentCandidates.filter(
          (candidate) => candidate.id !== round.eliminated.id,
        );
      }

      return html;
    })
    .join("\n");

  const winnerHtml = poll.results?.winner
    ? `<p><strong>Currently leading:</strong> ${renderBookLabel(poll.results.winner)}</p>`
    : "";

  return `${roundsHtml}\n${winnerHtml}`;
}

export function renderProvisionalScoresPage(poll) {
  if (!poll) {
    return pageShell({
      title: "Provisional Scores",
      body: `<h1>Provisional Scores</h1><p class="empty">No active poll right now.</p>`,
    });
  }

  const phaseLabel = poll.phase === "voting" ? "Voting" : "Nomination";
  const tallyLabel =
    poll.tallyMethod === "chris-style" ? "Chris Style" : "Ranked Choice";
  const meta = `<p class="meta">Phase: ${phaseLabel} &middot; Tally method: ${tallyLabel} &middot; Votes cast: ${poll.results?.totalVotes ?? 0}</p>`;

  const standingsHtml =
    poll.tallyMethod === "chris-style"
      ? renderChrisStyleStandings(poll)
      : renderRankedChoiceStandings(poll);

  return pageShell({
    title: `Provisional Scores - ${poll.title}`,
    body: `<h1>${escapeHtml(poll.title)}</h1>${meta}${standingsHtml}`,
  });
}
