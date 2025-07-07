// src/interactions/nominate.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleNominate } from "./nominate.js";
import { PollManager } from "../services/pollManager.js";
import { createResponse } from "../utils/createResponse.js";

vi.mock("../services/pollManager.js");
vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => ({
    ...data,
    json: () => Promise.resolve(data),
  })),
}));

describe("handleNominate", () => {
  beforeEach(() => {
    PollManager.mockClear();
    createResponse.mockClear();
  });

  it("should add a nomination to a poll", async () => {
    const mockNominateBook = vi.fn().mockResolvedValue(true);
    const mockGetPoll = vi.fn().mockResolvedValue({
      id: "123",
      title: "Test Poll",
      phase: "nomination",
      nominations: [],
    });
    PollManager.mockImplementation(() => {
      return {
        nominateBook: mockNominateBook,
        getPoll: mockGetPoll,
      };
    });

    const interaction = {
      member: { user: { id: "test-user", username: "test-user" } },
    };
    const options = [
      { name: "title", value: "Test Book" },
      { name: "author", value: "Test Author" },
      { name: "link", value: "http://example.com" },
    ];
    const poll = {
      id: "123",
      phase: "nomination",
      nominations: [],
    };
    const pollManager = new PollManager({});

    const response = await handleNominate({
      interaction,
      options,
      pollManager,
      poll,
      userId: "test-user",
    });
    const data = await response.json();

    expect(mockNominateBook).toHaveBeenCalledWith(
      "123",
      {
        title: "Test Book",
        author: "Test Author",
        link: "http://example.com",
        userId: "test-user",
        username: "test-user",
      },
      {
        isAdmin: undefined,
        isPollCreator: undefined,
      }
    );
    expect(createResponse).toHaveBeenCalled();
    expect(data.content).toContain("nominated");
  });
});
