// src/interactions/remove-nomination.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleRemoveNomination } from "./remove-nomination.js";
import { PollManager } from "../services/pollManager.js";
import { createResponse } from "../utils/createResponse.js";

vi.mock("../services/pollManager.js");
vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => ({
    ...data,
    json: () => Promise.resolve(data),
  })),
}));

describe("handleRemoveNomination", () => {
  beforeEach(() => {
    PollManager.mockClear();
    createResponse.mockClear();
  });

  it("should remove a nomination", async () => {
    const mockRemoveUserNomination = vi.fn().mockResolvedValue(true);
    PollManager.mockImplementation(() => {
      return {
        removeUserNomination: mockRemoveUserNomination,
      };
    });

    const options = [{ name: "nomination_id", value: "1" }];
    const poll = {
      id: "123",
      nominations: [{ id: "abc", title: "Test Book" }],
    };
    const pollManager = new PollManager({});

    const response = await handleRemoveNomination({
      options,
      pollManager,
      poll,
      isAdmin: true,
    });
    const data = await response.json();

    expect(mockRemoveUserNomination).toHaveBeenCalledWith("123", "abc");
    expect(createResponse).toHaveBeenCalledWith({
      ephemeral: true,
      content: '✅ Removed nomination: "Test Book" ',
    });
    expect(data.content).toBe('✅ Removed nomination: "Test Book" ');
  });
});
