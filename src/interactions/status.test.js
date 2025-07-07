// src/interactions/status.test.js
import { describe, it, expect, vi } from "vitest";
import { handlePollStatus } from "./status.js";
import { createResponse } from "../utils/createResponse.js";

vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => ({
    ...data,
    json: () => Promise.resolve(data),
  })),
}));

describe("handlePollStatus", () => {
  it("should return the poll status if the poll exists", async () => {
    const poll = {
      id: "123",
      title: "Test Poll",
      phase: "nomination",
      nominations: [],
      tallyMethod: "ranked-choice",
      nominationEnd: new Date().toISOString(),
      votingEnd: new Date().toISOString(),
    };

    const response = await handlePollStatus({ poll });
    const data = await response.json();

    expect(createResponse).toHaveBeenCalledWith({
      ephemeral: true,
      embeds: [expect.any(Object)],
    });
    expect(data.embeds[0].title).toBe("📚 Test Poll");
  });

  it("should return an error if the poll does not exist", async () => {
    const response = await handlePollStatus({ poll: null });
    const data = await response.json();

    expect(createResponse).toHaveBeenCalledWith({
      ephemeral: true,
      content: "❌ Poll not found.",
    });
    expect(data.content).toBe("❌ Poll not found.");
  });
});

