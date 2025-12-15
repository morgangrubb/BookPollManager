// src/interactions/add-vote.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAddVote } from "./add-vote.js";

describe("handleAddVote", () => {
  let mockPollManager;
  let mockInteraction;
  let mockOptions;

  beforeEach(() => {
    mockPollManager = {
      submitVote: vi.fn().mockResolvedValue(true),
      getPoll: vi.fn(),
      updatePoll: vi.fn().mockResolvedValue(true),
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

  it("should add a vote on behalf of someone else (chris-style)", async () => {
    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [
        { id: "1", title: "Book 1", author: "Author 1" },
        { id: "2", title: "Book 2", author: "Author 2" },
        { id: "3", title: "Book 3", author: "Author 3" },
        { id: "4", title: "Book 4", author: "Author 4" },
      ],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,3,2" },
    ];

    mockPollManager.getPoll.mockResolvedValue({
      ...poll,
      votes: [{ userId: "manual_John Doe", rankings: [0, 2, 1] }],
    });

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).toHaveBeenCalledWith(
      "test-poll",
      "manual_John Doe",
      [0, 2, 1],
    );

    const response = await result.json();
    expect(response.data.content).toContain('Vote successfully added for "John Doe"');
    expect(response.data.content).toContain("1st: Book 1");
    expect(response.data.content).toContain("2nd: Book 3");
    expect(response.data.content).toContain("3rd: Book 2");
    expect(response.data.flags).toBe(0); // Not ephemeral
  });

  it("should add a vote on behalf of someone else (ranked-choice)", async () => {
    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "voting",
      tallyMethod: "ranked-choice",
      nominations: [
        { id: "1", title: "Book 1", author: "Author 1" },
        { id: "2", title: "Book 2", author: "Author 2" },
        { id: "3", title: "Book 3", author: "Author 3" },
      ],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "Jane Smith" },
      { name: "rankings", type: 3, value: "2,1,3" },
    ];

    mockPollManager.getPoll.mockResolvedValue({
      ...poll,
      votes: [{ userId: "manual_Jane Smith", rankings: [1, 0, 2] }],
    });

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: false,
      isPollCreator: true,
    });

    expect(mockPollManager.submitVote).toHaveBeenCalledWith(
      "test-poll",
      "manual_Jane Smith",
      [1, 0, 2],
    );

    const response = await result.json();
    expect(response.data.content).toContain('Vote successfully added for "Jane Smith"');
    expect(response.data.content).toContain("#1: Book 2");
    expect(response.data.content).toContain("#2: Book 1");
    expect(response.data.content).toContain("#3: Book 3");
  });

  it("should deny adding vote if user is not admin or creator", async () => {
    const poll = {
      id: "test-poll",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,2,3" },
    ];

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: false,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain(
      "Only admins or the poll creator can add votes",
    );
    expect(response.data.flags).toBe(64); // Ephemeral
  });

  it("should deny adding vote during nomination phase", async () => {
    const poll = {
      id: "test-poll",
      phase: "nomination",
      tallyMethod: "chris-style",
      nominations: [],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,2,3" },
    ];

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("Cannot add votes during the nomination phase");
    expect(response.data.flags).toBe(64);
  });

  it("should deny adding vote to completed poll without force", async () => {
    const poll = {
      id: "test-poll",
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [
        { id: "1", title: "Book 1" },
        { id: "2", title: "Book 2" },
        { id: "3", title: "Book 3" },
      ],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,2,3" },
    ];

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("Cannot add votes to a completed poll");
    expect(response.data.content).toContain("force: true");
    expect(response.data.flags).toBe(64);
  });

  it("should add vote to completed poll with force and reopen", async () => {
    const poll = {
      id: "test-poll",
      title: "Test Poll",
      phase: "completed",
      tallyMethod: "chris-style",
      nominations: [
        { id: "1", title: "Book 1", author: "Author 1" },
        { id: "2", title: "Book 2", author: "Author 2" },
        { id: "3", title: "Book 3", author: "Author 3" },
      ],
      votes: [],
      results: { winner: "Book 1" },
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,2,3" },
      { name: "force", type: 5, value: true },
    ];

    mockPollManager.getPoll.mockResolvedValue({
      ...poll,
      phase: "voting",
      votes: [{ userId: "manual_John Doe", rankings: [0, 1, 2] }],
    });

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.updatePoll).toHaveBeenCalledWith("test-poll", {
      phase: "voting",
      results: null,
    });

    expect(mockPollManager.submitVote).toHaveBeenCalledWith(
      "test-poll",
      "manual_John Doe",
      [0, 1, 2],
    );

    const response = await result.json();
    expect(response.data.content).toContain("Vote added");
    expect(response.data.content).toContain("reopened");
  });

  it("should reject invalid number of picks for chris-style", async () => {
    const poll = {
      id: "test-poll",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [
        { id: "1", title: "Book 1" },
        { id: "2", title: "Book 2" },
        { id: "3", title: "Book 3" },
      ],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,2" }, // Only 2 picks, need 3
    ];

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("Chris-style voting requires exactly 3 picks");
    expect(response.data.flags).toBe(64);
  });

  it("should reject invalid number of picks for ranked-choice", async () => {
    const poll = {
      id: "test-poll",
      phase: "voting",
      tallyMethod: "ranked-choice",
      nominations: [
        { id: "1", title: "Book 1" },
        { id: "2", title: "Book 2" },
        { id: "3", title: "Book 3" },
        { id: "4", title: "Book 4" },
      ],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,2,3" }, // Only 3 picks, need 4
    ];

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("Ranked-choice voting requires ranking all 4 nominations");
    expect(response.data.flags).toBe(64);
  });

  it("should reject invalid nomination numbers", async () => {
    const poll = {
      id: "test-poll",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [
        { id: "1", title: "Book 1" },
        { id: "2", title: "Book 2" },
        { id: "3", title: "Book 3" },
      ],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,5,2" }, // 5 is invalid
    ];

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("Invalid nomination number: 5");
    expect(response.data.flags).toBe(64);
  });

  it("should reject duplicate nominations in vote", async () => {
    const poll = {
      id: "test-poll",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [
        { id: "1", title: "Book 1" },
        { id: "2", title: "Book 2" },
        { id: "3", title: "Book 3" },
      ],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,1,2" }, // Duplicate "1"
    ];

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain("Cannot vote for the same nomination multiple times");
    expect(response.data.flags).toBe(64);
  });

  it("should reject if username already voted", async () => {
    const poll = {
      id: "test-poll",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [
        { id: "1", title: "Book 1" },
        { id: "2", title: "Book 2" },
        { id: "3", title: "Book 3" },
      ],
      votes: [{ userId: "manual_John Doe", rankings: [0, 1, 2] }],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,2,3" },
    ];

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.submitVote).not.toHaveBeenCalled();

    const response = await result.json();
    expect(response.data.content).toContain('A vote for "John Doe" has already been recorded');
    expect(response.data.flags).toBe(64);
  });

  it("should handle database errors gracefully", async () => {
    const poll = {
      id: "test-poll",
      phase: "voting",
      tallyMethod: "chris-style",
      nominations: [
        { id: "1", title: "Book 1" },
        { id: "2", title: "Book 2" },
        { id: "3", title: "Book 3" },
      ],
      votes: [],
    };

    mockOptions = [
      { name: "username", type: 3, value: "John Doe" },
      { name: "rankings", type: 3, value: "1,2,3" },
    ];

    mockPollManager.submitVote.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const result = await handleAddVote({
      interaction: mockInteraction,
      options: mockOptions,
      pollManager: mockPollManager,
      poll,
      isAdmin: true,
      isPollCreator: false,
    });

    const response = await result.json();
    expect(response.data.content).toContain("Failed to add vote");
    expect(response.data.content).toContain("Database connection failed");
    expect(response.data.flags).toBe(64);
  });
});
