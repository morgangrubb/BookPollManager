import { describe, it, expect, vi } from "vitest";
import { handleDeletePoll } from "./delete.js";
import { getOptionValue } from "../utils/getOptionValue.js";

vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => data),
}));

vi.mock("../utils/sendDiscordMessage.js", () => ({
  sendDiscordMessage: vi.fn(),
}));

const mockPollManager = {
  deletePoll: vi.fn(),
  env: {},
};

const mockInteraction = {
  guild_id: "test-guild",
  member: { user: { id: "test-user" } },
};

const mockPoll = {
  id: "test-poll",
  title: "Test Poll",
  guildId: "test-guild",
  creatorId: "test-user",
  channelId: "test-channel",
};

describe("handleDeletePoll", () => {
  it("should delete a poll successfully by the creator", async () => {
    const options = [
      { name: "poll_id", value: "test-poll" },
      { name: "confirm", value: "DELETE" },
    ];
    mockPollManager.deletePoll.mockResolvedValue(true);

    const result = await handleDeletePoll({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: false,
      isPollCreator: true,
    });

    expect(mockPollManager.deletePoll).toHaveBeenCalledWith("test-poll");
    expect(result.content).toContain("successfully deleted");
  });

  it("should allow an admin to delete a poll", async () => {
    const options = [
      { name: "poll_id", value: "test-poll" },
      { name: "confirm", value: "DELETE" },
    ];
    mockPollManager.deletePoll.mockResolvedValue(true);

    const result = await handleDeletePoll({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: { ...mockPoll, creatorId: "another-user" },
      isAdmin: true,
      isPollCreator: false,
    });

    expect(result.content).toContain("successfully deleted");
  });

  it("should fail if confirmation text is incorrect", async () => {
    const options = [
      { name: "poll_id", value: "test-poll" },
      { name: "confirm", value: "WRONG" },
    ];

    const result = await handleDeletePoll({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: mockPoll,
      isAdmin: false,
      isPollCreator: true,
    });

    expect(result.content).toContain('must type "DELETE"');
  });

  it("should fail if user is not admin or creator", async () => {
    const options = [
      { name: "poll_id", value: "test-poll" },
      { name: "confirm", value: "DELETE" },
    ];

    const result = await handleDeletePoll({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: { ...mockPoll, creatorId: "another-user" },
      isAdmin: false,
      isPollCreator: false,
    });

    expect(result.content).toContain(
      "Only the poll creator or server administrators"
    );
  });

  it("should fail if poll is not found", async () => {
    const options = [{ name: "poll_id", value: "non-existent-poll" }];

    const result = await handleDeletePoll({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: null,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(result.content).toContain("could not be found");
  });
});
