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

  it("should show indexed nominations when nominations flag is true", async () => {
    const poll = {
      id: "123",
      title: "Test Poll",
      phase: "voting",
      nominations: [
        {
          title: "Book 1",
          author: "Author 1",
          link: "https://example.com/1",
          username: "user1",
        },
        {
          title: "Book 2",
          author: "Author 2",
          link: "https://example.com/2",
          username: "user2",
        },
      ],
      tallyMethod: "chris-style",
      nominationEnd: new Date().toISOString(),
      votingEnd: new Date().toISOString(),
      results: { totalVotes: 0 },
    };

    const options = [{ name: "nominations", value: true }];

    const response = await handlePollStatus({ poll, options });
    const data = await response.json();

    expect(data.embeds[0].description).toContain("**1.**");
    expect(data.embeds[0].description).toContain("**2.**");
    expect(data.embeds[0].description).toContain("/poll add-vote");
  });

  it("should show regular nominations when nominations flag is false", async () => {
    const poll = {
      id: "123",
      title: "Test Poll",
      phase: "voting",
      nominations: [
        {
          title: "Book 1",
          author: "Author 1",
          link: "https://example.com/1",
          username: "user1",
        },
      ],
      tallyMethod: "chris-style",
      nominationEnd: new Date().toISOString(),
      votingEnd: new Date().toISOString(),
      results: { totalVotes: 0 },
    };

    const options = [{ name: "nominations", value: false }];

    const response = await handlePollStatus({ poll, options });
    const data = await response.json();

    expect(data.embeds[0].description).toContain("1. [Book 1]");
    expect(data.embeds[0].description).not.toContain("**1.**");
  });
});
