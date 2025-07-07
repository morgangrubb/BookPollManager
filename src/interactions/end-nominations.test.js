import { describe, it, expect, vi } from "vitest";
import { handleEndNominations } from "./end-nominations.js";

vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => data),
}));

vi.mock("../services/scheduler.js", () => ({
  announceVotingPhase: vi.fn(),
}));

const mockPollManager = {
  updatePollPhase: vi.fn(),
  getPoll: vi.fn(),
  env: {},
};

const mockPoll = {
  id: "test-poll",
  title: "Test Poll",
  phase: "nomination",
  channelId: "test-channel",
};

describe("handleEndNominations", () => {
  it("should end the nomination phase successfully", async () => {
    mockPollManager.updatePollPhase.mockResolvedValue(true);
    mockPollManager.getPoll.mockResolvedValue({ ...mockPoll, phase: "voting" });

    const result = await handleEndNominations({
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePollPhase).toHaveBeenCalledWith(
      "test-poll",
      "voting"
    );
    expect(result.content).toContain("Nomination phase ended early");
  });

  it("should fail if user is not admin or creator", async () => {
    const result = await handleEndNominations({
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: false,
      isPollCreator: false,
    });

    expect(result.content).toContain(
      "Only admins or the poll creator can end the nomination phase."
    );
  });

  it("should fail if poll is not in nomination phase", async () => {
    const result = await handleEndNominations({
      pollManager: mockPollManager,
      poll: { ...mockPoll, phase: "voting" },
      isAdmin: true,
      isPollCreator: false,
    });

    expect(result.content).toContain("not in the nomination phase");
  });
});
