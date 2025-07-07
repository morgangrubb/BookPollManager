import { describe, it, expect, vi } from "vitest";
import { handleTieBreak } from "./tie-break.js";

vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => data),
}));

vi.mock("../utils/format.js", () => ({
  formatResults: vi.fn(() => ({ title: "Tie Broken" })),
}));

const mockPollManager = {
  updatePoll: vi.fn(),
  getPoll: vi.fn(),
};

const mockPoll = {
  id: "test-poll",
  phase: "completed",
  tallyMethod: "chris-style",
  results: {
    tie: true,
    tiedNominations: [
      { id: "nom-1", title: "Book A" },
      { id: "nom-2", title: "Book B" },
    ],
  },
};

describe("handleTieBreak", () => {
  it("should show tie-break options if no winner is selected", async () => {
    const interaction = { data: { values: [] } };
    const response = await handleTieBreak({
      interaction,
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: true,
      isPollCreator: false,
    });
    const data = await response.json();
    expect(data.data.content).toContain("Select the winner");
    expect(data.data.components[0].components[0].options).toHaveLength(2);
  });

  it("should resolve a tie successfully", async () => {
    const interaction = { data: { values: ["nom-1"] } };
    mockPollManager.updatePoll.mockResolvedValue(true);
    mockPollManager.getPoll.mockResolvedValue({
      ...mockPoll,
      results: { ...mockPoll.results, winner: { id: "nom-1", title: "Book A" } },
    });

    const response = await handleTieBreak({
      interaction,
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: true,
      isPollCreator: false,
    });
    const data = await response.json();
    expect(data.data.embeds[0].title).toBe("Tie Broken");
  });

  it("should fail if user is not admin or creator", async () => {
    const interaction = { data: { values: ["nom-1"] } };
    const result = await handleTieBreak({
      interaction,
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: false,
      isPollCreator: false,
    });
    expect(result.content).toContain("Only the poll creator or a server admin");
  });

  it("should fail if poll is not in a tie state", async () => {
    const interaction = { data: { values: ["nom-1"] } };
    const result = await handleTieBreak({
      interaction,
      pollManager: mockPollManager,
      poll: { ...mockPoll, results: { tie: false } },
      isAdmin: true,
      isPollCreator: false,
    });
    expect(result.content).toContain("no tie to break");
  });
});
