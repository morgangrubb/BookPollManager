import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./services/pollManager.js", () => ({
  PollManager: vi.fn(),
}));

import worker from "./index.js";
import { PollManager } from "./services/pollManager.js";

describe("public poll pages", () => {
  let pollManager;

  beforeEach(() => {
    pollManager = {
      getCompletedPollsPage: vi.fn(),
      getCompletedPollWinners: vi.fn(),
      getPoll: vi.fn(),
    };
    PollManager.mockReset();
    PollManager.mockImplementation(() => pollManager);
  });

  it("renders the requested completed-poll page with 20-item pagination", async () => {
    pollManager.getCompletedPollsPage.mockResolvedValue({
      polls: [
        {
          id: "POLL-21",
          title: "Poll 21",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      page: 2,
      totalPages: 2,
      totalPolls: 21,
    });

    const response = await worker.fetch(
      new Request("https://example.com/polls?page=2"),
      {},
      {},
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(pollManager.getCompletedPollsPage).toHaveBeenCalledWith(2, 20);
    expect(html).toContain("Poll 21");
    expect(html).toContain('href="/poll/POLL-21"');
  });

  it("downloads all completed poll winners as CSV", async () => {
    pollManager.getCompletedPollWinners.mockResolvedValue([
      {
        id: "POLL-1",
        title: "January Poll",
        createdAt: "2026-01-01T00:00:00.000Z",
        nominationDeadline: "2026-01-05T00:00:00.000Z",
        votingDeadline: "2026-01-10T00:00:00.000Z",
        winner: {
          author: "Author One",
          title: "Book One",
          link: "https://example.com/book-one",
        },
      },
    ]);

    const response = await worker.fetch(
      new Request("https://example.com/polls.csv"),
      {},
      {},
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain(
      "poll-winners.csv",
    );
    expect(pollManager.getCompletedPollWinners).toHaveBeenCalledOnce();
    expect(csv).toContain('"POLL-1"');
    expect(csv).toContain('"Author One"');
    expect(csv).toContain('"Book One"');
    expect(csv).toContain('"https://example.com/book-one"');
  });

  it("renders a completed non-test poll detail page", async () => {
    pollManager.getPoll.mockResolvedValue({
      id: "POLL-1",
      title: "Completed Poll",
      phase: "completed",
      isTest: false,
      tallyMethod: "chris-style",
      createdAt: "2026-01-01T00:00:00.000Z",
      nominations: [{ id: 1, title: "Book One" }],
      results: {
        winner: { id: 1, title: "Book One" },
        standings: [{ nomination: { id: 1, title: "Book One" }, points: 4 }],
      },
    });

    const response = await worker.fetch(
      new Request("https://example.com/poll/POLL-1"),
      {},
      {},
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(pollManager.getPoll).toHaveBeenCalledWith("POLL-1");
    expect(html).toContain("Completed Poll");
    expect(html).toContain("Book One");
    expect(html).toContain(">4</td>");
  });

  it("does not expose test poll details", async () => {
    pollManager.getPoll.mockResolvedValue({
      id: "TEST-1",
      phase: "completed",
      isTest: true,
    });

    const response = await worker.fetch(
      new Request("https://example.com/poll/TEST-1"),
      {},
      {},
    );

    expect(response.status).toBe(404);
  });
});
