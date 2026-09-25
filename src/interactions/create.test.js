// src/interactions/create.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCreatePoll } from "./create.js";
import { PollManager } from "../services/pollManager.js";

// Mock the PollManager
vi.mock("../services/pollManager.js");

describe("handleCreatePoll", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    PollManager.mockClear();
  });

  it("should create a poll and return a success message", async () => {
    const mockCreatePoll = vi.fn().mockResolvedValue({
      id: "123",
      title: "Test Poll",
      nominationEnd: new Date().toISOString(),
      votingEnd: new Date().toISOString(),
    });
    PollManager.mockImplementation(() => {
      return {
        createPoll: mockCreatePoll,
      };
    });

    const interaction = {
      guild_id: "test-guild",
      channel_id: "test-channel",
      member: { user: { id: "test-user" } },
    };
    const nominationEnd = new Date(Date.now() + 86400000).toISOString();
    const votingEnd = new Date(Date.now() + 2 * 86400000).toISOString();
    const options = [
      { name: "title", value: "Test Poll" },
      { name: "nomination_end", value: nominationEnd },
      { name: "voting_end", value: votingEnd },
    ];
    const pollManager = new PollManager({});

    const response = await handleCreatePoll({
      interaction,
      options,
      pollManager,
    });
    const data = await response.json();

    expect(PollManager).toHaveBeenCalledTimes(1);
    expect(mockCreatePoll).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Poll",
        guildId: "test-guild",
        channelId: "test-channel",
        creatorId: "test-user",
        tallyMethod: "ranked-choice",
        nominationEnd,
        votingEnd,
      }),
    );
    expect(response.status).toBe(200);
    expect(data.type).toBe(4);
    expect(data.data.embeds[0].title).toBe("📚 New Book Poll Created!");
  });

  it("marks the poll as a test poll and badges the confirmation embed", async () => {
    const mockCreatePoll = vi.fn().mockResolvedValue({
      id: "123",
      title: "Test Poll",
      isTest: true,
    });
    PollManager.mockImplementation(() => {
      return {
        createPoll: mockCreatePoll,
      };
    });

    const interaction = {
      guild_id: "test-guild",
      channel_id: "test-channel",
      member: { user: { id: "test-user" } },
    };
    const nominationEnd = new Date(Date.now() + 86400000).toISOString();
    const votingEnd = new Date(Date.now() + 2 * 86400000).toISOString();
    const options = [
      { name: "title", value: "Test Poll" },
      { name: "nomination_end", value: nominationEnd },
      { name: "voting_end", value: votingEnd },
      { name: "test", value: true },
    ];
    const pollManager = new PollManager({});

    const response = await handleCreatePoll({
      interaction,
      options,
      pollManager,
    });
    const data = await response.json();

    expect(mockCreatePoll).toHaveBeenCalledWith(
      expect.objectContaining({ isTest: true }),
    );
    expect(data.data.embeds[0].title).toBe("🧪 📚 New Book Poll Created!");
    expect(
      data.data.embeds[0].fields.some((f) => f.name === "🧪 Test Poll"),
    ).toBe(true);
  });
});

