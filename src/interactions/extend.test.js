// src/interactions/extend.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handlePollExtend } from "./extend.js";

describe("handlePollExtend", () => {
  let mockPollManager;
  let mockInteraction;
  let mockOptions;

  beforeEach(() => {
    mockPollManager = {
      updatePoll: vi.fn().mockResolvedValue(true),
      getPoll: vi.fn(),
    };

    mockInteraction = {
      guild_id: "test-guild",
      channel_id: "test-channel",
      member: {
        user: {
          id: "test-user",
        },
      },
    };

    mockOptions = [];
  });

  it("should extend nomination phase by 1 day by default", async () => {
    const nominationEnd = new Date("2024-12-31T23:59:59Z");
    const votingEnd = new Date("2025-01-07T23:59:59Z");

    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "nomination",
      nominationDeadline: nominationEnd.toISOString(),
      votingDeadline: votingEnd.toISOString(),
      results: null,
    };

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePoll).toHaveBeenCalledWith("test-poll", {
      nominationDeadline: new Date(
        nominationEnd.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString(),
      votingDeadline: new Date(
        votingEnd.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    const response = await result.json();
    expect(response.data.content).toContain("extended by 1 day");
    expect(response.data.flags).toBe(0); // Not ephemeral
  });

  it("should extend nomination phase by specified days", async () => {
    const nominationEnd = new Date("2024-12-31T23:59:59Z");
    const votingEnd = new Date("2025-01-07T23:59:59Z");

    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "nomination",
      nominationDeadline: nominationEnd.toISOString(),
      votingDeadline: votingEnd.toISOString(),
      results: null,
    };

    mockOptions = [{ name: "days", type: 4, value: 7 }];

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: false,
      isPollCreator: true,
    });

    expect(mockPollManager.updatePoll).toHaveBeenCalledWith("test-poll", {
      nominationDeadline: new Date(
        nominationEnd.getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      votingDeadline: new Date(
        votingEnd.getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    const response = await result.json();
    expect(response.data.content).toContain("extended by 7 days");
  });

  it("should extend voting phase only and clear results", async () => {
    const nominationEnd = new Date("2024-12-25T23:59:59Z");
    const votingEnd = new Date("2024-12-31T23:59:59Z");

    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "voting",
      nominationDeadline: nominationEnd.toISOString(),
      votingDeadline: votingEnd.toISOString(),
      results: { winner: "Some Book", tie: false },
    };

    mockOptions = [{ name: "days", type: 4, value: 3 }];

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePoll).toHaveBeenCalledWith("test-poll", {
      votingDeadline: new Date(
        votingEnd.getTime() + 3 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      results: null,
    });

    const response = await result.json();
    expect(response.data.content).toContain(
      "voting phase has been extended by 3 days",
    );
    expect(response.data.content).not.toContain("nomination");
  });

  it("should extend voting phase without clearing results if none exist", async () => {
    const votingEnd = new Date("2024-12-31T23:59:59Z");

    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "voting",
      nominationDeadline: new Date("2024-12-25T23:59:59Z").toISOString(),
      votingDeadline: votingEnd.toISOString(),
      results: null,
    };

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePoll).toHaveBeenCalledWith("test-poll", {
      votingDeadline: new Date(
        votingEnd.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
  });

  it("should deny extension for completed poll without force parameter", async () => {
    const votingEnd = new Date("2024-12-31T23:59:59Z");

    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "completed",
      nominationDeadline: new Date("2024-12-25T23:59:59Z").toISOString(),
      votingDeadline: votingEnd.toISOString(),
      results: { winner: "Some Book", tie: false },
    };

    mockOptions = [{ name: "days", type: 4, value: 2 }];

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePoll).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("Cannot extend a completed poll");
    expect(response.data.content).toContain("force: true");
    expect(response.data.flags).toBe(64); // Ephemeral
  });

  it("should extend completed poll with force parameter", async () => {
    const votingEnd = new Date("2024-12-31T23:59:59Z");

    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "completed",
      nominationDeadline: new Date("2024-12-25T23:59:59Z").toISOString(),
      votingDeadline: votingEnd.toISOString(),
      results: { winner: "Some Book", tie: false },
    };

    mockOptions = [
      { name: "days", type: 4, value: 2 },
      { name: "force", type: 5, value: true },
    ];

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePoll).toHaveBeenCalledWith("test-poll", {
      votingDeadline: new Date(
        votingEnd.getTime() + 2 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      results: null,
      phase: "voting",
    });

    const response = await result.json();
    expect(response.data.content).toContain("reopened and extended by 2 days");
    expect(response.data.content).toContain("Voting (reopened)");
    expect(response.data.flags).toBe(0); // Not ephemeral
  });

  it("should reject extension if user is not admin or creator", async () => {
    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "nomination",
      nominationDeadline: new Date("2024-12-31T23:59:59Z").toISOString(),
      votingDeadline: new Date("2025-01-07T23:59:59Z").toISOString(),
    };

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: false,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePoll).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain(
      "Only admins or the poll creator can extend a poll",
    );
    expect(response.data.flags).toBe(64); // Ephemeral
  });

  it("should reject days outside valid range", async () => {
    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "nomination",
      nominationDeadline: new Date("2024-12-31T23:59:59Z").toISOString(),
      votingDeadline: new Date("2025-01-07T23:59:59Z").toISOString(),
    };

    mockOptions = [{ name: "days", type: 4, value: 15 }];

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePoll).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("Days must be between 1 and 14");
    expect(response.data.flags).toBe(64); // Ephemeral
  });

  it("should handle database errors gracefully", async () => {
    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "nomination",
      nominationDeadline: new Date("2024-12-31T23:59:59Z").toISOString(),
      votingDeadline: new Date("2025-01-07T23:59:59Z").toISOString(),
    };

    mockPollManager.updatePoll.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    const response = await result.json();
    expect(response.data.content).toContain("Failed to extend poll");
    expect(response.data.content).toContain("Database connection failed");
    expect(response.data.flags).toBe(64); // Ephemeral
  });

  it("should allow poll creator to extend with force", async () => {
    const votingEnd = new Date("2024-12-31T23:59:59Z");

    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "completed",
      nominationDeadline: new Date("2024-12-25T23:59:59Z").toISOString(),
      votingDeadline: votingEnd.toISOString(),
      results: { winner: "Some Book", tie: false },
    };

    mockOptions = [
      { name: "days", type: 4, value: 1 },
      { name: "force", type: 5, value: true },
    ];

    const result = await handlePollExtend({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: false,
      isPollCreator: true,
    });

    expect(mockPollManager.updatePoll).toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("reopened and extended");
  });
});
