// Renders the hidden /stats page: historical stats across all completed
// polls (nomination wins by user, first-pick accuracy, points cast toward
// the winner, submission timing, and poll size leaderboards). See
// utils/stats.js for how the numbers are computed.

import { escapeHtml, pageShell } from "./html.js";

function formatDuration(ms) {
  if (ms === null || ms === undefined) return "—";

  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return remainingMinutes > 0
      ? `${totalHours}h ${remainingMinutes}m`
      : `${totalHours}h`;
  }

  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return remainingHours > 0
    ? `${totalDays}d ${remainingHours}h`
    : `${totalDays}d`;
}

function renderNominationWinsTable(rows) {
  if (rows.length === 0) {
    return `<p class="empty">No nominations recorded yet.</p>`;
  }

  const body = rows
    .map(
      (row, idx) =>
        `<tr><td>${idx + 1}</td><td>${escapeHtml(row.displayName)}</td><td>${row.wins}</td><td>${row.second ?? 0}</td><td>${row.third ?? 0}</td></tr>`,
    )
    .join("\n");

  return `<table>
<thead><tr><th>#</th><th>User</th><th>1st Place</th><th>2nd Place</th><th>3rd Place</th></tr></thead>
<tbody>${body}</tbody>
</table>`;
}

function renderFirstChoiceTable(rows) {
  if (rows.length === 0) {
    return `<p class="empty">No votes recorded yet.</p>`;
  }

  const body = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.displayName)}</td><td>${row.hits}</td><td>${row.totalVotes}</td><td>${Math.round(row.rate * 100)}%</td></tr>`,
    )
    .join("\n");

  return `<table>
<thead><tr><th>User</th><th>Picked Winner 1st</th><th>Total Votes</th><th>Rate</th></tr></thead>
<tbody>${body}</tbody>
</table>`;
}

function renderPointsTable(rows, { columnHeader, emptyMessage }) {
  if (rows.length === 0) {
    return `<p class="empty">${emptyMessage}</p>`;
  }

  const body = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.displayName)}</td><td>${row.points}</td></tr>`,
    )
    .join("\n");

  return `<table>
<thead><tr><th>User</th><th>${columnHeader}</th></tr></thead>
<tbody>${body}</tbody>
</table>`;
}

function renderNominationPointsTable(rows) {
  if (rows.length === 0) {
    return `<p class="empty">No chris-style points recorded yet.</p>`;
  }

  const body = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.displayName)}</td><td>${row.totalPoints}</td><td>${row.avgPoints.toFixed(1)}</td></tr>`,
    )
    .join("\n");

  return `<table>
<thead><tr><th>User</th><th>Total Points</th><th>Avg Points / Poll</th></tr></thead>
<tbody>${body}</tbody>
</table>`;
}

function renderTimingTable(rows) {
  if (rows.length === 0) {
    return `<p class="empty">No nominations or votes recorded yet.</p>`;
  }

  const body = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.displayName)}</td><td>${formatDuration(row.earliestNominationMs)}</td><td>${formatDuration(row.avgNominationMs)}</td><td>${formatDuration(row.earliestVotingMs)}</td><td>${formatDuration(row.avgVotingMs)}</td></tr>`,
    )
    .join("\n");

  return `<table>
<thead><tr><th>User</th><th>Earliest Nomination</th><th>Avg Nomination</th><th>Earliest Vote</th><th>Avg Vote</th></tr></thead>
<tbody>${body}</tbody>
</table>
<p class="meta">Time elapsed between when a phase opened and when the user submitted.</p>`;
}

function renderPollTitleWithYear(row) {
  const year = row.createdAt ? new Date(row.createdAt).getFullYear() : null;
  const yearSuffix = Number.isFinite(year) ? ` (${year})` : "";
  return `${escapeHtml(row.title)}${yearSuffix}`;
}

function renderPollCountTable(rows, countKey) {
  if (rows.length === 0) {
    return `<p class="empty">No completed polls yet.</p>`;
  }

  const body = rows
    .map(
      (row, idx) =>
        `<tr><td>${idx + 1}</td><td>${renderPollTitleWithYear(row)}</td><td>${row[countKey]}</td></tr>`,
    )
    .join("\n");

  const countLabel = countKey === "nominationCount" ? "Nominations" : "Votes";

  return `<table>
<thead><tr><th>#</th><th>Poll</th><th>${countLabel}</th></tr></thead>
<tbody>${body}</tbody>
</table>`;
}

export function renderStatsPage(stats) {
  if (!stats || stats.totalCompletedPolls === 0) {
    return pageShell({
      title: "Poll Stats",
      body: `<h1>Poll Stats</h1><p class="empty">No completed polls yet.</p>`,
    });
  }

  const meta = `<p class="meta">Completed polls analyzed: ${stats.totalCompletedPolls} &middot; Polls with a winner: ${stats.pollsWithWinner}</p>`;

  const body = `<h1>Poll Stats</h1>
${meta}
<h2>Nomination Wins by User</h2>
${renderNominationWinsTable(stats.nominationWins)}
<h2>Nomination Points Received by User (Chris-Style Polls)</h2>
${renderNominationPointsTable(stats.nominationPointsReceived || [])}
<h2>How Often a User's First Pick Was the Winner</h2>
${renderFirstChoiceTable(stats.firstChoiceAccuracy)}
<h2>Points Cast Toward the Winning Nomination (Chris-Style Polls)</h2>
${renderPointsTable(stats.pointsTowardWinner, { columnHeader: "Points Cast Toward Winner", emptyMessage: "No chris-style points recorded yet." })}
<h2>Nomination &amp; Voting Speed by User</h2>
${renderTimingTable(stats.userTiming || [])}
<h2>Top 10 Polls by Nominations</h2>
${renderPollCountTable(stats.topPollsByNominations || [], "nominationCount")}
<h2>Bottom 10 Polls by Nominations</h2>
${renderPollCountTable(stats.bottomPollsByNominations || [], "nominationCount")}
<h2>Top 10 Polls by Votes</h2>
${renderPollCountTable(stats.topPollsByVotes || [], "voteCount")}
<h2>Bottom 10 Polls by Votes</h2>
${renderPollCountTable(stats.bottomPollsByVotes || [], "voteCount")}`;

  return pageShell({ title: "Poll Stats", body });
}
