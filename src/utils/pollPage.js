import { escapeHtml, pageShell } from "./html.js";

function sameNomination(left, right) {
  if (!left || !right) return false;

  if (left.id != null && right.id != null) {
    return String(left.id) === String(right.id);
  }

  return Boolean(left.title && right.title && left.title === right.title);
}

function mergeNomination(base, resultNomination) {
  if (!base) return resultNomination;
  if (!resultNomination) return base;

  const merged = { ...base };
  for (const [key, value] of Object.entries(resultNomination)) {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }
  return merged;
}

function getAllNominations(poll) {
  const nominations = Array.isArray(poll?.nominations)
    ? [...poll.nominations]
    : [];
  const standings = Array.isArray(poll?.results?.standings)
    ? poll.results.standings
    : [];
  const rounds = Array.isArray(poll?.results?.rounds)
    ? poll.results.rounds
    : [];
  const resultNominations = [
    ...standings.map((standing) => standing?.nomination),
    ...rounds.map((round) => round?.eliminated),
    poll?.results?.winner,
  ].filter(Boolean);

  for (const resultNomination of resultNominations) {
    const existingIndex = nominations.findIndex((nomination) =>
      sameNomination(nomination, resultNomination),
    );

    if (existingIndex === -1) {
      nominations.push(resultNomination);
    } else {
      nominations[existingIndex] = mergeNomination(
        nominations[existingIndex],
        resultNomination,
      );
    }
  }

  return nominations;
}

function safeBookLink(link) {
  if (typeof link !== "string" || !/^https?:\/\//i.test(link)) {
    return null;
  }
  return link;
}

function renderNomination(nomination) {
  if (!nomination) return "Unknown nomination";

  const title = escapeHtml(nomination.title || "Untitled nomination");
  const link = safeBookLink(nomination.link);
  const titleHtml = link
    ? `<a href="${escapeHtml(link)}" rel="noopener noreferrer">${title}</a>`
    : title;
  const author = nomination.author
    ? ` <span class="author">by ${escapeHtml(nomination.author)}</span>`
    : "";

  return `${titleHtml}${author}`;
}

function numericPoints(value) {
  const points = Number(value);
  return Number.isFinite(points) ? points : 0;
}

function getChrisStyleRows(poll) {
  const nominations = getAllNominations(poll);
  const standings = Array.isArray(poll?.results?.standings)
    ? poll.results.standings
    : [];
  const usedNominationIndexes = new Set();
  const rows = [];

  for (const standing of standings) {
    const resultNomination = standing?.nomination;
    if (!resultNomination) continue;

    const nominationIndex = nominations.findIndex(
      (nomination, index) =>
        !usedNominationIndexes.has(index) &&
        sameNomination(nomination, resultNomination),
    );
    const resolvedIndex = nominationIndex === -1 ? null : nominationIndex;
    const nomination =
      resolvedIndex === null ? resultNomination : nominations[resolvedIndex];

    if (resolvedIndex !== null) {
      usedNominationIndexes.add(resolvedIndex);
    }

    rows.push({
      nomination,
      points: numericPoints(standing.points),
    });
  }

  nominations.forEach((nomination, index) => {
    if (!usedNominationIndexes.has(index)) {
      rows.push({ nomination, points: 0 });
    }
  });

  return rows.sort((left, right) => right.points - left.points);
}

function getRankedChoiceOrder(poll) {
  const nominations = getAllNominations(poll);
  const rounds = Array.isArray(poll?.results?.rounds)
    ? poll.results.rounds
    : [];
  const ordered = [];
  const usedNominationIndexes = new Set();

  const addNomination = (candidate) => {
    if (!candidate) return;

    const index = nominations.findIndex(
      (nomination, nominationIndex) =>
        !usedNominationIndexes.has(nominationIndex) &&
        sameNomination(nomination, candidate),
    );
    if (index === -1) return;

    usedNominationIndexes.add(index);
    ordered.push(nominations[index]);
  };

  addNomination(poll?.results?.winner);
  [...rounds]
    .reverse()
    .forEach((round) => addNomination(round?.eliminated));
  nominations.forEach(addNomination);

  return ordered;
}

function renderChrisStyleTally(poll) {
  const rows = getChrisStyleRows(poll);
  const winner = poll?.results?.winner;

  if (rows.length === 0) {
    return `<h2>Final points tally</h2><p class="empty">No nominations recorded.</p>`;
  }

  const winnerText = winner
    ? `<p class="meta">Winner: ${renderNomination(winner)}</p>`
    : poll?.results?.tie
      ? `<p class="meta">The poll ended in a tie.</p>`
      : "";
  const tableRows = rows
    .map((row, index) => {
      const winnerClass = winner && sameNomination(row.nomination, winner)
        ? ' class="winner"'
        : "";
      const winnerMarker = winner && sameNomination(row.nomination, winner)
        ? " 🏆"
        : "";

      return `<tr${winnerClass}><td>${index + 1}</td><td>${renderNomination(row.nomination)}${winnerMarker}</td><td>${row.points}</td></tr>`;
    })
    .join("\n");

  return `<h2>Final points tally</h2>
${winnerText}
<table>
<thead><tr><th>#</th><th>Nomination</th><th>Points</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>`;
}

function renderRankedChoiceTally(poll) {
  const rows = getRankedChoiceOrder(poll);
  const winner = poll?.results?.winner;

  if (rows.length === 0) {
    return `<h2>Final ranked-choice tally</h2><p class="empty">No nominations recorded.</p>`;
  }

  const winnerText = winner
    ? `<p class="meta">Winner: ${renderNomination(winner)}</p>`
    : "";
  const tableRows = rows
    .map((nomination, index) => {
      const winnerMarker = winner && sameNomination(nomination, winner)
        ? " 🏆"
        : "";
      return `<tr><td>${index + 1}</td><td>${renderNomination(nomination)}${winnerMarker}</td></tr>`;
    })
    .join("\n");

  return `<h2>Final ranked-choice tally</h2>
${winnerText}
<p class="meta">Ranked-choice polls do not use points; nominations are shown in final order.</p>
<table>
<thead><tr><th>Final place</th><th>Nomination</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>`;
}

export function renderPollPage(poll) {
  if (!poll) {
    return pageShell({
      title: "Poll not found",
      body: `<h1>Poll not found</h1><p class="empty">This poll is not available.</p><p><a href="/polls">Back to polls</a></p>`,
    });
  }

  const tallyMethod =
    poll.tallyMethod === "chris-style" ? "Chris Style" : "Ranked Choice";
  const votes = poll.results?.totalVotes;
  const votesText = Number.isFinite(Number(votes))
    ? ` &middot; Votes cast: ${Number(votes)}`
    : "";
  const createdAt = poll.createdAt ? new Date(poll.createdAt) : null;
  const createdDate =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toISOString().slice(0, 10)
      : "Unknown date";
  const tallyHtml =
    poll.tallyMethod === "ranked-choice"
      ? renderRankedChoiceTally(poll)
      : renderChrisStyleTally(poll);

  return pageShell({
    title: poll.title || "Poll",
    body: `<p><a href="/polls">← All polls</a></p>
<h1>${escapeHtml(poll.title || "Untitled poll")}</h1>
<p class="meta">Started: ${escapeHtml(createdDate)} &middot; Tally method: ${escapeHtml(tallyMethod)}${votesText}</p>
${tallyHtml}`,
  });
}
