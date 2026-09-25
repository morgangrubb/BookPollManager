const CSV_HEADERS = [
  "Poll ID",
  "Start Date",
  "Nomination Deadline",
  "Voting Deadline",
  "Poll Name",
  "Winning Book Author",
  "Winning Book Title",
  "Winning Book Link",
];

function escapeCsvValue(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function winnerValue(row, key) {
  return row?.winner?.[key] ?? "";
}

export function renderWinnersCsv(rows = []) {
  const pollRows = Array.isArray(rows) ? rows : [];
  const lines = [CSV_HEADERS, ...pollRows.map((row) => [
    row?.id,
    row?.createdAt,
    row?.nominationDeadline,
    row?.votingDeadline,
    row?.title,
    winnerValue(row, "author"),
    winnerValue(row, "title"),
    winnerValue(row, "link"),
  ])];

  return `${lines
    .map((line) => line.map(escapeCsvValue).join(","))
    .join("\r\n")}\r\n`;
}
