import { describe, it, expect, vi } from "vitest";
import { handleEditNomination } from "./edit-nomination.js";

vi.mock("../utils/createResponse.js", () => ({
  createResponse: vi.fn((data) => data),
}));

const mockPollManager = {
  editNomination: vi.fn(),
};

const mockInteraction = {
  guild_id: "test-guild",
  member: { user: { id: "test-user" } },
};

const mockPoll = {
  id: "test-poll",
  nominations: [
    { id: "nom-1", userId: "test-user", title: "Old Title" },
    { id: "nom-2", userId: "another-user", title: "Another Book" },
    { id: "nom-3", userId: "test-user", title: "Second Book" },
  ],
};

describe("handleEditNomination", () => {
  it("should edit a nomination successfully", async () => {
    const options = [
      { name: "nomination_id", value: "1" },
      { name: "title", value: "New Title" },
    ];
    mockPollManager.editNomination.mockResolvedValue(true);

    const result = await handleEditNomination({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: mockPoll,
      userId: "test-user",
      isAdmin: false,
      isPollCreator: false,
    });

    expect(mockPollManager.editNomination).toHaveBeenCalledWith("test-poll", {
      nominationId: "nom-1",
      userId: "test-user",
      title: "New Title",
      author: undefined,
      link: undefined,
      isAdmin: false,
      isPollCreator: false,
    });
    expect(result.content).toContain("updated successfully");
  });

  it("should fail if trying to edit another user's nomination", async () => {
    const options = [
      { name: "nomination_id", value: "2" },
      { name: "title", value: "New Title" },
    ];

    const result = await handleEditNomination({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: mockPoll,
      userId: "test-user",
      isAdmin: false,
      isPollCreator: false,
    });

    expect(result.content).toContain("only edit your own nominations");
  });

  it("should require nomination_id if user has multiple nominations", async () => {
    const options = [{ name: "title", value: "New Title" }];
    const pollWithMultipleNoms = {
      ...mockPoll,
      nominations: [
        { id: "nom-1", userId: "test-user", title: "Old Title" },
        { id: "nom-3", userId: "test-user", title: "Second Book" },
      ],
    };

    const result = await handleEditNomination({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: pollWithMultipleNoms,
      userId: "test-user",
      isAdmin: false,
      isPollCreator: false,
    });

    expect(result.content).toContain("multiple nominations");
  });

  it("should allow admin to edit any nomination", async () => {
    const options = [
      { name: "nomination_id", value: "2" },
      { name: "title", value: "Admin Edit" },
    ];
    mockPollManager.editNomination.mockResolvedValue(true);

    const result = await handleEditNomination({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: mockPoll,
      userId: "admin-user",
      isAdmin: true,
      isPollCreator: false,
    });

    expect(mockPollManager.editNomination).toHaveBeenCalled();
    expect(result.content).toContain("updated successfully");
  });

  it("should fail if no fields are provided to update", async () => {
    const options = [{ name: "nomination_id", value: "1" }];

    const result = await handleEditNomination({
      interaction: mockInteraction,
      options,
      pollManager: mockPollManager,
      poll: mockPoll,
      userId: "test-user",
      isAdmin: false,
      isPollCreator: false,
    });

    expect(result.content).toContain("at least one field to update");
  });
});
