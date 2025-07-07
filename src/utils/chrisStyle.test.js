import { describe, it, expect } from "vitest";
import { calculateChrisStyleWinner } from "./chrisStyle.js";

const candidates = [
  { id: 1, title: "Book A" },
  { id: 2, title: "Book B" },
  { id: 3, title: "Book C" },
  { id: 4, title: "Book D" },
];

describe("calculateChrisStyleWinner", () => {
  it("should correctly calculate a clear winner", () => {
    const votes = [
      { userId: "user1", rankings: [1, 2, 3] }, // A: 3, B: 2, C: 1
      { userId: "user2", rankings: [1, 3, 2] }, // A: 3, C: 2, B: 1
      { userId: "user3", rankings: [2, 1, 3] }, // B: 3, A: 2, C: 1
    ];
    // Expected scores:
    // Book A: 3 + 3 + 2 = 8
    // Book B: 2 + 1 + 3 = 6
    // Book C: 1 + 2 + 1 = 4
    const results = calculateChrisStyleWinner(candidates, votes);
    expect(results.winner.id).toBe(1);
    expect(results.tie).toBe(false);
    expect(results.standings[0].nomination.id).toBe(1);
    expect(results.standings[0].points).toBe(8);
    expect(results.standings[1].points).toBe(6);
    expect(results.standings[2].points).toBe(4);
  });

  it("should correctly identify a tie for first place", () => {
    const votes = [
      { userId: "user1", rankings: [1, 2, 3] }, // A: 3, B: 2, C: 1
      { userId: "user2", rankings: [2, 1, 3] }, // B: 3, A: 2, C: 1
    ];
    // Expected scores:
    // Book A: 3 + 2 = 5
    // Book B: 2 + 3 = 5
    // Book C: 1 + 1 = 2
    const results = calculateChrisStyleWinner(candidates, votes);
    expect(results.winner).toBeNull();
    expect(results.tie).toBe(true);
    expect(results.tiedNominations).toHaveLength(2);
    expect(results.tiedNominations.map((n) => n.id).sort()).toEqual([1, 2]);
  });

  it("should handle a scenario with no votes", () => {
    const votes = [];
    const results = calculateChrisStyleWinner(candidates, votes);
    expect(results.winner).toBeNull();
    expect(results.tie).toBe(false);
    expect(results.totalVotes).toBe(0);
    results.standings.forEach((s) => expect(s.points).toBe(0));
  });

  it("should handle votes for candidates that are not in the list", () => {
    const votes = [{ userId: "user1", rankings: [1, 5, 6] }]; // 5 and 6 are not candidates
    const results = calculateChrisStyleWinner(candidates, votes);
    expect(results.standings.find((s) => s.nomination.id === 1).points).toBe(3);
    // Ensure other candidates have 0 points
    expect(results.standings.find((s) => s.nomination.id === 2).points).toBe(0);
  });

  it("should correctly award points for first, second, and third place", () => {
    const votes = [{ userId: "user1", rankings: [1, 2, 3] }];
    const results = calculateChrisStyleWinner(candidates, votes);
    expect(results.standings.find((s) => s.nomination.id === 1).points).toBe(3);
    expect(results.standings.find((s) => s.nomination.id === 2).points).toBe(2);
    expect(results.standings.find((s) => s.nomination.id === 3).points).toBe(1);
  });
});
