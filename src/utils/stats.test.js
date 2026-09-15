import { describe, it, expect } from "vitest";
import { computeStats } from "./stats.js";

const bookA = { id: 1, title: "Book A", userId: "u-alice", username: "Alice" };
const bookB = { id: 2, title: "Book B", userId: "u-bob", username: "Bob" };
const bookC = { id: 3, title: "Book C", userId: "u-carol", username: "Carol" };

describe("computeStats", () => {
  it("returns empty stats when there are no completed polls", () => {
    const stats = computeStats([]);
    expect(stats.totalCompletedPolls).toBe(0);
    expect(stats.pollsWithWinner).toBe(0);
    expect(stats.nominationWins).toEqual([]);
    expect(stats.firstChoiceAccuracy).toEqual([]);
    expect(stats.pointsTowardWinner).toEqual([]);
  });

  it("ignores polls that are not completed", () => {
    const poll = {
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [bookA],
      votes: [],
      results: { winner: bookA },
    };
    const stats = computeStats([poll]);
    expect(stats.totalCompletedPolls).toBe(0);
  });

  it("ignores polls flagged as test polls, even if completed", () => {
    const testPoll = {
      phase: "completed",
      tallyMethod: "chris-style",
      isTest: true,
      nominations: [bookA, bookB],
      votes: [{ userId: "u-dave", rankings: [1, 2] }],
      results: { winner: bookA },
    };
    const realPoll = {
      phase: "completed",
      tallyMethod: "chris-style",
      isTest: false,
      nominations: [bookB, bookC],
      votes: [{ userId: "u-dave", rankings: [2, 3] }],
      results: { winner: bookB },
    };

    const stats = computeStats([testPoll, realPoll]);

    expect(stats.totalCompletedPolls).toBe(1);
    expect(stats.nominationWins.find((r) => r.displayName === "Alice")).toBeUndefined();
    expect(stats.nominationWins.find((r) => r.displayName === "Bob").wins).toBe(1);
  });

  it("counts nomination wins by user, including zero-win nominators", () => {
    const poll1 = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA, bookB],
      votes: [],
      results: { winner: bookA },
    };
    const poll2 = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA, bookC],
      votes: [],
      results: { winner: bookA },
    };

    const stats = computeStats([poll1, poll2]);

    expect(stats.totalCompletedPolls).toBe(2);
    expect(stats.pollsWithWinner).toBe(2);

    const alice = stats.nominationWins.find((r) => r.displayName === "Alice");
    const bob = stats.nominationWins.find((r) => r.displayName === "Bob");
    const carol = stats.nominationWins.find((r) => r.displayName === "Carol");

    expect(alice.wins).toBe(2);
    expect(bob.wins).toBe(0);
    expect(carol.wins).toBe(0);
    // Most wins first
    expect(stats.nominationWins[0].displayName).toBe("Alice");
  });

  it("does not count a win when a chris-style poll tied with no winner", () => {
    const poll = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA, bookB],
      votes: [],
      results: { winner: null, tie: true },
    };
    const stats = computeStats([poll]);
    expect(stats.pollsWithWinner).toBe(0);
    expect(stats.nominationWins.every((r) => r.wins === 0)).toBe(true);
  });

  it("tracks how often a user's first choice matched the winner, resolving by nomination id", () => {
    const poll = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA, bookB, bookC],
      votes: [
        { userId: "u-dave", rankings: [1, 2, 3] }, // first pick = bookA (winner)
        { userId: "u-erin", rankings: [2, 1, 3] }, // first pick = bookB
      ],
      results: { winner: bookA },
    };

    const stats = computeStats([poll]);

    const dave = stats.firstChoiceAccuracy.find((r) => r.displayName === "u-dave");
    const erin = stats.firstChoiceAccuracy.find((r) => r.displayName === "u-erin");

    expect(dave.hits).toBe(1);
    expect(dave.totalVotes).toBe(1);
    expect(dave.rate).toBe(1);

    expect(erin.hits).toBe(0);
    expect(erin.totalVotes).toBe(1);
    expect(erin.rate).toBe(0);
  });

  it("resolves 0-based index rankings (as used by /poll add-vote) to nominations", () => {
    // Use nomination ids that don't collide with their array index, so this
    // only passes if the index-based fallback is actually exercised.
    const bookX = { id: 101, title: "Book X", userId: "u-alice", username: "Alice" };
    const bookY = { id: 102, title: "Book Y", userId: "u-bob", username: "Bob" };
    const bookZ = { id: 103, title: "Book Z", userId: "u-carol", username: "Carol" };

    const poll = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookX, bookY, bookZ],
      votes: [{ userId: "manual_Frank", rankings: [1, 0, 2] }], // first pick = bookY by index
      results: { winner: bookY },
    };

    const stats = computeStats([poll]);
    const frank = stats.firstChoiceAccuracy.find(
      (r) => r.displayName === "Frank",
    );
    expect(frank.hits).toBe(1);
  });

  it("strips the manual_ prefix from manually-added voter names", () => {
    const poll = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA],
      votes: [{ userId: "manual_Grace Hopper", rankings: [1] }],
      results: { winner: bookA },
    };

    const stats = computeStats([poll]);
    expect(stats.firstChoiceAccuracy[0].displayName).toBe("Grace Hopper");
  });

  it("sums chris-style points cast toward the winning nomination", () => {
    const poll = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA, bookB, bookC],
      votes: [
        { userId: "u-dave", rankings: [1, 2, 3] }, // bookA (winner) is 1st -> 3 pts
        { userId: "u-erin", rankings: [2, 1, 3] }, // bookA (winner) is 2nd -> 2 pts
        { userId: "u-frank", rankings: [2, 3, 1] }, // bookA (winner) is 3rd -> 1 pt
        { userId: "u-grace", rankings: [2, 3] }, // bookA not ranked -> 0 pts
      ],
      results: { winner: bookA },
    };

    const stats = computeStats([poll]);

    const points = Object.fromEntries(
      stats.pointsTowardWinner.map((r) => [r.displayName, r.points]),
    );

    expect(points["u-dave"]).toBe(3);
    expect(points["u-erin"]).toBe(2);
    expect(points["u-frank"]).toBe(1);
    expect(points["u-grace"]).toBeUndefined();
  });

  it("does not award points toward the winner for ranked-choice polls", () => {
    const poll = {
      phase: "completed",
      tallyMethod: "ranked-choice",
      nominations: [bookA, bookB],
      votes: [{ userId: "u-dave", rankings: [1, 2] }],
      results: { winner: bookA },
    };

    const stats = computeStats([poll]);
    expect(stats.pointsTowardWinner).toEqual([]);
  });

  it("returns empty timing and poll leaderboard data when there are no completed polls", () => {
    const stats = computeStats([]);
    expect(stats.userTiming).toEqual([]);
    expect(stats.topPollsByNominations).toEqual([]);
    expect(stats.bottomPollsByNominations).toEqual([]);
    expect(stats.topPollsByVotes).toEqual([]);
    expect(stats.bottomPollsByVotes).toEqual([]);
  });

  it("computes earliest and average nomination/voting times per user", () => {
    const poll = {
      phase: "completed",
      tallyMethod: "chris-style",
      createdAt: "2024-01-01T00:00:00.000Z",
      nominationDeadline: "2024-01-08T00:00:00.000Z",
      nominations: [
        {
          ...bookA,
          timestamp: "2024-01-01T01:00:00.000Z", // 1h after nomination phase opened
        },
        {
          ...bookB,
          userId: "u-alice",
          username: "Alice",
          timestamp: "2024-01-01T03:00:00.000Z", // 3h after nomination phase opened
        },
      ],
      votes: [
        {
          userId: "u-dave",
          rankings: [1, 2],
          timestamp: "2024-01-08T02:00:00.000Z", // 2h after voting phase opened
        },
      ],
      results: { winner: bookA },
    };

    const stats = computeStats([poll]);

    const alice = stats.userTiming.find((r) => r.displayName === "Alice");
    expect(alice.earliestNominationMs).toBe(60 * 60 * 1000);
    expect(alice.avgNominationMs).toBe(2 * 60 * 60 * 1000);
    expect(alice.earliestVotingMs).toBeNull();
    expect(alice.avgVotingMs).toBeNull();

    const dave = stats.userTiming.find((r) => r.displayName === "u-dave");
    expect(dave.earliestVotingMs).toBe(2 * 60 * 60 * 1000);
    expect(dave.avgVotingMs).toBe(2 * 60 * 60 * 1000);
    expect(dave.earliestNominationMs).toBeNull();
    expect(dave.avgNominationMs).toBeNull();
  });

  it("ignores nomination/vote timestamps that predate the relevant phase", () => {
    const poll = {
      phase: "completed",
      tallyMethod: "chris-style",
      createdAt: "2024-01-01T00:00:00.000Z",
      nominationDeadline: "2024-01-08T00:00:00.000Z",
      nominations: [
        { ...bookA, timestamp: "2023-12-31T00:00:00.000Z" }, // before poll was created
      ],
      votes: [],
      results: { winner: bookA },
    };

    const stats = computeStats([poll]);
    expect(stats.userTiming).toEqual([]);
  });

  it("ranks polls by nomination count and vote count, top 10 and bottom 10", () => {
    const makePoll = (title, nominationCount, voteCount) => ({
      id: title,
      title,
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: Array.from({ length: nominationCount }, (_, i) => ({
        id: i,
        title: `Book ${i}`,
        userId: `u-${i}`,
        username: `User ${i}`,
      })),
      votes: Array.from({ length: voteCount }, (_, i) => ({
        userId: `voter-${i}`,
        rankings: [],
      })),
      results: { winner: null },
    });

    // 15 polls, with nomination/vote counts running in opposite directions,
    // so top 10 and bottom 10 are distinct (no overlap) and length-capped.
    const letters = "ABCDEFGHIJKLMNO".split("");
    const polls = letters.map((letter, idx) =>
      makePoll(`Poll ${letter}`, idx + 1, letters.length - idx),
    );

    const stats = computeStats(polls);

    expect(stats.topPollsByNominations).toHaveLength(10);
    expect(stats.topPollsByNominations.map((p) => p.title)).toEqual([
      "Poll O",
      "Poll N",
      "Poll M",
      "Poll L",
      "Poll K",
      "Poll J",
      "Poll I",
      "Poll H",
      "Poll G",
      "Poll F",
    ]);

    expect(stats.bottomPollsByNominations).toHaveLength(10);
    expect(stats.bottomPollsByNominations.map((p) => p.title)).toEqual([
      "Poll A",
      "Poll B",
      "Poll C",
      "Poll D",
      "Poll E",
      "Poll F",
      "Poll G",
      "Poll H",
      "Poll I",
      "Poll J",
    ]);

    expect(stats.topPollsByVotes).toHaveLength(10);
    expect(stats.topPollsByVotes.map((p) => p.title)).toEqual([
      "Poll A",
      "Poll B",
      "Poll C",
      "Poll D",
      "Poll E",
      "Poll F",
      "Poll G",
      "Poll H",
      "Poll I",
      "Poll J",
    ]);

    expect(stats.bottomPollsByVotes).toHaveLength(10);
    expect(stats.bottomPollsByVotes.map((p) => p.title)).toEqual([
      "Poll O",
      "Poll N",
      "Poll M",
      "Poll L",
      "Poll K",
      "Poll J",
      "Poll I",
      "Poll H",
      "Poll G",
      "Poll F",
    ]);
  });

  it("includes each poll's createdAt in the leaderboard entries", () => {
    const poll = {
      id: "p1",
      title: "Poll With Date",
      createdAt: "2022-03-15T00:00:00.000Z",
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA],
      votes: [],
      results: { winner: null },
    };

    const stats = computeStats([poll]);

    expect(stats.topPollsByNominations[0].createdAt).toBe(
      "2022-03-15T00:00:00.000Z",
    );
    expect(stats.topPollsByVotes[0].createdAt).toBe(
      "2022-03-15T00:00:00.000Z",
    );
  });

  it("aggregates points and first-choice hits across multiple polls for the same user", () => {
    const poll1 = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA, bookB],
      votes: [{ userId: "u-dave", rankings: [1, 2] }],
      results: { winner: bookA },
    };
    const poll2 = {
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [bookA, bookC],
      votes: [{ userId: "u-dave", rankings: [1, 3] }],
      results: { winner: bookA },
    };

    const stats = computeStats([poll1, poll2]);

    const dave = stats.firstChoiceAccuracy.find((r) => r.displayName === "u-dave");
    expect(dave.hits).toBe(2);
    expect(dave.totalVotes).toBe(2);

    const davePoints = stats.pointsTowardWinner.find(
      (r) => r.displayName === "u-dave",
    );
    expect(davePoints.points).toBe(6);
  });
});
