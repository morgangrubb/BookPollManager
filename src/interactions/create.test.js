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
    const options = [
      { name: "title", value: "Test Poll" },
      { name: "nomination_end", value: "2025-12-31 23:59" },
      { name: "voting_end", value: "2026-01-15 23:59" },
    ];
    const pollManager = new PollManager({});

    const response = await handleCreatePoll({
      interaction,
      options,
      pollManager,
    });
    const data = await response.json();

    expect(PollManager).toHaveBeenCalledTimes(1);
    expect(mockCreatePoll).toHaveBeenCalledWith({
      title: "Test Poll",
      guildId: "test-guild",
      channelId: "test-channel",
      creatorId: "test-user",
      tallyMethod: "ranked-choice",
      nominationEnd: new Date("2025-12-31 23:59").toISOString(),
      votingEnd: new Date("2026-01-15 23:59").toISOString(),
    });
    expect(response.status).toBe(200);
    expect(data.type).toBe(4);
    expect(data.data.embeds[0].title).toBe("📚 New Book Poll Created!");
  });
});

