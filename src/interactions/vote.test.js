// src/interactions/vote.test.js
import { describe, it, expect, vi } from "vitest";
import { handleVote } from "./vote.js";
import { createResponse } from "../utils/createResponse.js";
import { generateChrisStyleVotingInterface } from "../utils/chrisStyle.js";
import { generateRankedChoiceVotingInterface } from "../utils/rankedChoice.js";

vi.mock("../utils/createResponse.js");
vi.mock("../utils/chrisStyle.js");
vi.mock("../utils/rankedChoice.js");

describe("handleVote", () => {
  it("should generate the Chris-style voting interface", async () => {
    const poll = {
      phase: "voting",
      tallyMethod: "chris-style",
      votes: [],
    };
    const interaction = {
      member: { user: { id: "test-user" } },
    };
    await handleVote({ poll, userId: "test-user", interaction });
    expect(generateChrisStyleVotingInterface).toHaveBeenCalled();
  });

  it("should generate the ranked-choice voting interface", async () => {
    const poll = {
      phase: "voting",
      tallyMethod: "ranked-choice",
      votes: [],
    };
    const interaction = {
      member: { user: { id: "test-user" } },
    };
    await handleVote({ poll, userId: "test-user", interaction });
    expect(generateRankedChoiceVotingInterface).toHaveBeenCalled();
  });

  it("should return an error if the poll is not in the voting phase", async () => {
    const poll = { phase: "nomination" };
    await handleVote({ poll });
    expect(createResponse).toHaveBeenCalledWith({
      ephemeral: true,
      content: "This poll is not in the voting phase.",
    });
  });

  it("should return an error if the user has already voted", async () => {
    const poll = {
      phase: "voting",
      votes: [{ userId: "test-user" }],
    };
    await handleVote({ poll, userId: "test-user" });
    expect(createResponse).toHaveBeenCalledWith({
      ephemeral: true,
      content: "You have already voted in this poll!",
    });
  });
});
