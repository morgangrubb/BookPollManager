// Renders the hidden /provisional-scores page: a live view of standings for
// whichever poll is currently in the nomination or voting phase.

import { escapeHtml, pageShell } from "./html.js";

function renderBookLabel(nomination) {
  if (!nomination) return "Unknown";
  const title = escapeHtml(nomination.title);
  const author = nomination.author
    ? ` by ${escapeHtml(nomination.author)}`
    : "";
  return `${title}${author}`;
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
