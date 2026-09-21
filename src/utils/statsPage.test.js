import { describe, it, expect } from "vitest";
import { renderStatsPage } from "./statsPage.js";

describe("renderStatsPage", () => {
  it("shows a message when there are no completed polls", () => {
    const html = renderStatsPage({
      totalCompletedPolls: 0,
      pollsWithWinner: 0,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
    });
    expect(html).toContain("No completed polls yet");
  });

  it("renders the nomination wins table sorted with the most wins first", () => {
    const stats = {
      totalCompletedPolls: 3,
      pollsWithWinner: 3,
      nominationWins: [
        { displayName: "Alice", wins: 2 },
        { displayName: "Bob", wins: 0 },
      ],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
    };

    const html = renderStatsPage(stats);

    expect(html).toContain("Completed polls analyzed: 3");
    expect(html).toContain("Polls with a winner: 3");

    const aliceIndex = html.indexOf("Alice");
    const bobIndex = html.indexOf("Bob");
    expect(aliceIndex).toBeGreaterThan(-1);
    expect(aliceIndex).toBeLessThan(bobIndex);
  });

  it("renders 2nd and 3rd place columns in the nomination wins table", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [
        { displayName: "Alice", wins: 1, second: 0, third: 0 },
        { displayName: "Bob", wins: 0, second: 1, third: 0 },
        { displayName: "Carol", wins: 0, second: 0, third: 1 },
      ],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
    };

    const html = renderStatsPage(stats);

    expect(html).toContain("1st Place");
    expect(html).toContain("2nd Place");
    expect(html).toContain("3rd Place");

    const aliceRow = html
      .split("\n")
      .find((line) => line.includes("Alice"));
    expect(aliceRow).toContain("<td>1</td><td>0</td><td>0</td>");

    const bobRow = html.split("\n").find((line) => line.includes("Bob"));
    expect(bobRow).toContain("<td>0</td><td>1</td><td>0</td>");

    const carolRow = html.split("\n").find((line) => line.includes("Carol"));
    expect(carolRow).toContain("<td>0</td><td>0</td><td>1</td>");
  });

  it("defaults 2nd and 3rd place counts to 0 when missing from a row", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [{ displayName: "Dave", wins: 1 }],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
    };

    const html = renderStatsPage(stats);
    const daveRow = html.split("\n").find((line) => line.includes("Dave"));
    expect(daveRow).toContain("<td>1</td><td>0</td><td>0</td>");
  });

  it("renders the first-choice accuracy table with a percentage", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [
        { displayName: "Dave", hits: 1, totalVotes: 2, rate: 0.5 },
      ],
      pointsTowardWinner: [],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("Dave");
    expect(html).toContain("50%");
  });

  it("renders the points-toward-winner table", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [{ displayName: "Erin", points: 6 }],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("Erin");
    expect(html).toContain("6");
  });

  it("renders the nomination-points-received table with total and average columns", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
      nominationPointsReceived: [
        { displayName: "Alice", totalPoints: 8, avgPoints: 4 },
        { displayName: "Bob", totalPoints: 0, avgPoints: 0 },
      ],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("Nomination Points Received by User");
    expect(html).toContain("Total Points");
    expect(html).toContain("Avg Points");
    const aliceIndex = html.indexOf("Alice");
    const bobIndex = html.indexOf("Bob");
    expect(html).toContain("8");
    expect(html).toContain("4.0");
    expect(aliceIndex).toBeGreaterThan(-1);
    expect(aliceIndex).toBeLessThan(bobIndex);
  });

  it("shows a fallback message when there are no nomination points recorded", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
      nominationPointsReceived: [],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("No chris-style points recorded yet.");
  });

  it("escapes user display names to prevent HTML injection", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [{ displayName: "<script>alert(1)</script>", wins: 1 }],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
    };

    const html = renderStatsPage(stats);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("renders the user timing table with human-readable durations", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
      userTiming: [
        {
          displayName: "Alice",
          earliestNominationMs: 90 * 60 * 1000, // 1h 30m
          avgNominationMs: 2 * 60 * 60 * 1000, // 2h
          earliestVotingMs: null,
          avgVotingMs: null,
        },
      ],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("Alice");
    expect(html).toContain("1h 30m");
    expect(html).toContain("2h");
    expect(html).toContain("—");
  });

  it("shows a fallback message when no timing data is available", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
      userTiming: [],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("No nominations or votes recorded yet");
  });

  it("renders top and bottom poll leaderboards by nomination and vote count", () => {
    const stats = {
      totalCompletedPolls: 5,
      pollsWithWinner: 5,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
      topPollsByNominations: [
        { title: "Big Poll", nominationCount: 10 },
      ],
      bottomPollsByNominations: [
        { title: "Small Poll", nominationCount: 1 },
      ],
      topPollsByVotes: [{ title: "Popular Poll", voteCount: 20 }],
      bottomPollsByVotes: [{ title: "Quiet Poll", voteCount: 2 }],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("Top 10 Polls by Nominations");
    expect(html).toContain("Big Poll");
    expect(html).toContain("Bottom 10 Polls by Nominations");
    expect(html).toContain("Small Poll");
    expect(html).toContain("Top 10 Polls by Votes");
    expect(html).toContain("Popular Poll");
    expect(html).toContain("Bottom 10 Polls by Votes");
    expect(html).toContain("Quiet Poll");
  });

  it("shows the poll's creation year in parentheses next to its title", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
      topPollsByNominations: [
        {
          title: "Big Poll",
          nominationCount: 10,
          createdAt: "2023-06-01T00:00:00.000Z",
        },
      ],
      bottomPollsByNominations: [],
      topPollsByVotes: [],
      bottomPollsByVotes: [],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("Big Poll (2023)");
  });

  it("omits the year suffix when a poll has no creation date", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
      topPollsByNominations: [{ title: "Undated Poll", nominationCount: 3 }],
      bottomPollsByNominations: [],
      topPollsByVotes: [],
      bottomPollsByVotes: [],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("Undated Poll</td>");
    expect(html).not.toContain("Undated Poll (");
  });

  it("shows a fallback message when there are no polls for the leaderboards", () => {
    const stats = {
      totalCompletedPolls: 1,
      pollsWithWinner: 1,
      nominationWins: [],
      firstChoiceAccuracy: [],
      pointsTowardWinner: [],
      topPollsByNominations: [],
      bottomPollsByNominations: [],
      topPollsByVotes: [],
      bottomPollsByVotes: [],
    };

    const html = renderStatsPage(stats);
    expect(html).toContain("No completed polls yet.");
  });
});
