import { escapeHtml, pageShell } from "./html.js";

function formatStartDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toISOString().slice(0, 10);
}

function pageLink(page) {
  return `/polls?page=${page}`;
}

function renderPagination(page, totalPages) {
  if (totalPages <= 1) return "";

  const previous =
    page > 1
      ? `<a href="${pageLink(page - 1)}" rel="prev">Previous</a>`
      : `<span class="disabled">Previous</span>`;
  const next =
    page < totalPages
      ? `<a href="${pageLink(page + 1)}" rel="next">Next</a>`
      : `<span class="disabled">Next</span>`;

  return `<nav class="pagination" aria-label="Poll pages">
${previous}<span>Page ${page} of ${totalPages}</span>${next}
</nav>`;
}

export function renderPollsPage({
  polls = [],
  page = 1,
  totalPages = 1,
  totalPolls = polls.length,
} = {}) {
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  const pageCount =
    Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 1;
  const pollRows = Array.isArray(polls) ? polls : [];
  const pollCount = Number.isFinite(Number(totalPolls))
    ? Math.max(0, Number(totalPolls))
    : pollRows.length;
  const pollLabel = pollCount === 1 ? "poll" : "polls";

  const body = [`<h1>Completed polls</h1>`];
  body.push(
    `<p class="meta">${pollCount} completed non-test ${pollLabel}</p>`,
  );
  body.push(
    `<p><a href="/polls.csv" download>Download winners as CSV</a></p>`,
  );

  if (pollRows.length === 0) {
    body.push(`<p class="empty">No completed polls yet.</p>`);
  } else {
    const rows = pollRows
      .map((poll) => {
        const id = poll?.id == null ? "" : String(poll.id);
        const title = poll?.title || "Untitled poll";
        const createdAt = poll?.createdAt || "";
        const date = formatStartDate(createdAt);

        return `<tr>
<td><a href="/poll/${escapeHtml(encodeURIComponent(id))}">${escapeHtml(title)}</a><div class="meta">${escapeHtml(id)}</div></td>
<td><time datetime="${escapeHtml(createdAt)}">${escapeHtml(date)}</time></td>
</tr>`;
      })
      .join("\n");

    body.push(`<table>
<thead><tr><th>Poll</th><th>Started</th></tr></thead>
<tbody>${rows}</tbody>
</table>`);
  }

  body.push(renderPagination(currentPage, pageCount));

  return pageShell({
    title: "Completed Polls",
    body: body.join("\n"),
  });
}
