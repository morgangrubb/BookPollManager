// src/interactions/withdraw-nomination.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleWithdrawNomination } from "./withdraw-nomination.js";
import { PollManager } from "../services/pollManager.js";
import { createResponse } from "../utils/createResponse.js";

vi.mock("../services/pollManager.js");
vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => ({
    ...data,
    json: () => Promise.resolve(data),
  })),
}));

describe("handleWithdrawNomination", () => {
  beforeEach(() => {
    PollManager.mockClear();
    createResponse.mockClear();
  });

  it("should withdraw a nomination", async () => {
    const mockRemoveUserNomination = vi.fn().mockResolvedValue(true);
    PollManager.mockImplementation(() => {
      return {
        removeUserNomination: mockRemoveUserNomination,
      };
    });

    const interaction = {
      member: { user: { id: "test-user" } },
    };
    const poll = {
      id: "123",
      nominations: [{ id: "abc", userId: "test-user" }],
    };
    const pollManager = new PollManager({});

    const response = await handleWithdrawNomination({
      interaction,
      pollManager,
      poll,
    });
    const data = await response.json();

    expect(mockRemoveUserNomination).toHaveBeenCalledWith("123", "abc");
    expect(createResponse).toHaveBeenCalledWith({
      ephemeral: true,
      content: "✅ Your nomination has been withdrawn.",
    });
    expect(data.content).toBe("✅ Your nomination has been withdrawn.");
  });
});
