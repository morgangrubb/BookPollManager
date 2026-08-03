import { describe, it, expect } from "vitest";
import { renderProvisionalScoresPage } from "./provisionalScores.js";

describe("renderProvisionalScoresPage", () => {
  it("shows a message when there is no active poll", () => {
    const html = renderProvisionalScoresPage(null);
    expect(html).toContain("No active poll");
  });

  it("shows a message when the active poll has no nominations", () => {
    const poll = {
      title: "Empty Poll",
      phase: "nomination",
      tallyMethod: "chris-style",
      nominations: [],
      results: { totalVotes: 0, standings: [] },
    };
    const html = renderProvisionalScoresPage(poll);
    expect(html).toContain("No nominations yet");
  });

  it("renders chris-style standings sorted by points, highest first", () => {
    const poll = {
      title: "Weekly <Poll>",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [],
      results: {
        totalVotes: 3,
        standings: [
          { nomination: { id: 1, title: "Book A", author: "Author A" }, points: 2 },
          { nomination: { id: 2, title: "Book B", author: "Author B" }, points: 5 },
          { nomination: { id: 3, title: "Book C" }, points: 0 },
        ],
      },
    };

    const html = renderProvisionalScoresPage(poll);

    expect(html).toContain("Weekly &lt;Poll&gt;");
    expect(html).toContain("Votes cast: 3");

    const bIndex = html.indexOf("Book B");
    const aIndex = html.indexOf("Book A");
    const cIndex = html.indexOf("Book C");
    expect(bIndex).toBeGreaterThan(-1);
    expect(bIndex).toBeLessThan(aIndex);
    expect(aIndex).toBeLessThan(cIndex);
  });

  it("escapes book titles and authors to prevent HTML injection", () => {
    const poll = {
      title: "Safe Poll",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [],
      results: {
        totalVotes: 1,
        standings: [
          {
            nomination: {
              id: 1,
              title: "<script>alert(1)</script>",
              author: "A & B",
            },
            points: 1,
          },
        ],
      },
    };

    const html = renderProvisionalScoresPage(poll);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("A &amp; B");
  });

  it("renders ranked-choice standings round by round with eliminations", () => {
    const bookA = { id: 1, title: "Book A", author: "Author A" };
    const bookB = { id: 2, title: "Book B", author: "Author B" };
    const bookC = { id: 3, title: "Book C", author: "Author C" };

    const poll = {
      title: "Ranked Poll",
      phase: "voting",
      tallyMethod: "ranked-choice",
      nominations: [bookA, bookB, bookC],
      results: {
        totalVotes: 5,
        winner: bookB,
        rounds: [
          { eliminated: bookC, votes: { 0: 1, 1: 2, 2: 2 } },
          { eliminated: null, votes: { 0: 2, 1: 3 } },
        ],
      },
    };

    const html = renderProvisionalScoresPage(poll);

    expect(html).toContain("Round 1");
    expect(html).toContain("Round 2");
    expect(html).toContain("Currently leading");

    const round1End = html.indexOf("Round 2");
    const round1Html = html.slice(0, round1End);
    expect(round1Html).toContain("Book C");
    expect(round1Html).toContain("Eliminated");

    const round2Html = html.slice(round1End);
    expect(round2Html).not.toContain("Book C");
    expect(round2Html).toContain("Book A");
    expect(round2Html).toContain("Book B");
  });

  it("handles a ranked-choice poll with no votes cast yet", () => {
    const poll = {
      title: "Fresh Poll",
      phase: "voting",
      tallyMethod: "ranked-choice",
      nominations: [{ id: 1, title: "Book A" }],
      results: { totalVotes: 0, rounds: [] },
    };

    const html = renderProvisionalScoresPage(poll);
    expect(html).toContain("No votes cast yet");
  });
});
