import { describe, expect, it } from "vitest";
import { renderWinnersCsv } from "./winnersCsv.js";

describe("renderWinnersCsv", () => {
  it("renders the requested poll and winner fields as escaped CSV", () => {
    const csv = renderWinnersCsv([
      {
        id: "POLL-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        nominationDeadline: "2026-01-05T00:00:00.000Z",
        votingDeadline: "2026-01-10T00:00:00.000Z",
        title: "January, 2026",
        winner: {
          author: 'A "Famous" Author',
          title: "Winning Book",
          link: "https://example.com/winner",
        },
      },
    ]);

    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe(
      '"Poll ID","Start Date","Nomination Deadline","Voting Deadline","Poll Name","Winning Book Author","Winning Book Title","Winning Book Link"',
    );
    expect(lines[1]).toContain('"POLL-1"');
    expect(lines[1]).toContain('"January, 2026"');
    expect(lines[1]).toContain('"A ""Famous"" Author"');
    expect(lines[1]).toContain('"Winning Book"');
    expect(lines[1]).toContain('"https://example.com/winner"');
  });

  it("leaves winner fields blank when no winner was resolved", () => {
    const csv = renderWinnersCsv([
      {
        id: "TIE-1",
        title: "Tied Poll",
        createdAt: "2026-01-01",
        nominationDeadline: "2026-01-05",
        votingDeadline: "2026-01-10",
        winner: null,
      },
    ]);

    expect(csv).toContain('"Tied Poll","","",""');
  });
});
