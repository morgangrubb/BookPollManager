import { describe, it, expect, vi } from "vitest";
import { handleEndVoting } from "./end-voting.js";

vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => data),
}));

vi.mock("../services/scheduler.js", () => ({
  announcePollCompletion: vi.fn(),
}));

vi.mock("../utils/format.js", () => ({
  formatResults: vi.fn(() => ({ title: "Results" })),
}));

const mockPollManager = {
  updatePollPhase: vi.fn(),
  getPoll: vi.fn(),
  calculateResults: vi.fn(),
  env: {},
};

const mockPoll = {
  id: "test-poll",
  title: "Test Poll",
  phase: "voting",
  channelId: "test-channel",
};

describe("handleEndVoting", () => {
  it("should end the voting phase successfully", async () => {
    mockPollManager.updatePollPhase.mockResolvedValue(true);
    mockPollManager.getPoll.mockResolvedValue({
      ...mockPoll,
      phase: "completed",
    });
    mockPollManager.calculateResults.mockReturnValue({ winner: "Book A" });

    const result = await handleEndVoting({
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePollPhase).toHaveBeenCalledWith(
      "test-poll",
      "completed"
    );
    expect(result.embeds[0].title).toBe("Results");
  });

  it("should fail if user is not admin or creator", async () => {
    const result = await handleEndVoting({
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: false,
      isPollCreator: false,
    });

    expect(result.content).toContain("Only the poll creator can end");
  });

  it("should fail if poll is not in voting phase", async () => {
    const result = await handleEndVoting({
      pollManager: mockPollManager,
      poll: { ...mockPoll, phase: "nomination" },
      isAdmin: true,
      isPollCreator: false,
    });

    expect(result.content).toContain("not in the voting phase");
  });

  it("should handle no results gracefully", async () => {
    mockPollManager.updatePollPhase.mockResolvedValue(true);
    mockPollManager.getPoll.mockResolvedValue({
      ...mockPoll,
      phase: "completed",
    });
    mockPollManager.calculateResults.mockReturnValue({});

    const result = await handleEndVoting({
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(result.content).toContain("Unable to calculate results");
  });
});
