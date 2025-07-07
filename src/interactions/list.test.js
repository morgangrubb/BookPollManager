// src/interactions/list.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleListPolls } from "./list.js";
import { PollManager } from "../services/pollManager.js";

vi.mock("../services/pollManager.js");

describe("handleListPolls", () => {
  beforeEach(() => {
    PollManager.mockClear();
  });

  it("should return a list of polls", async () => {
    const mockGetAllPolls = vi.fn().mockResolvedValue([
      {
        id: "123",
        title: "Test Poll 1",
        phase: "nomination",
        createdAt: new Date().toISOString(),
      },
      {
        id: "456",
        title: "Test Poll 2",
        phase: "voting",
        createdAt: new Date().toISOString(),
      },
    ]);
    PollManager.mockImplementation(() => {
      return {
        getAllPolls: mockGetAllPolls,
      };
    });

    const interaction = {
      guild_id: "test-guild",
    };
    const pollManager = new PollManager({});

    const response = await handleListPolls({
      interaction,
      pollManager,
    });
    const data = await response.json();

    expect(mockGetAllPolls).toHaveBeenCalledWith("test-guild");
    expect(response.status).toBe(200);
    expect(data.data.embeds[0].title).toBe("📚 Book Club Polls");
    expect(data.data.embeds[0].description).toContain("Test Poll 1");
    expect(data.data.embeds[0].description).toContain("Test Poll 2");
  });
});
