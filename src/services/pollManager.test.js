import { describe, expect, it } from "vitest";
import { PollManager } from "./pollManager.js";

function createDatabaseMock() {
  const calls = [];
  const db = {
    calls,
    prepare(sql) {
      const call = { sql, bindings: [] };
      calls.push(call);
      return {
        first: async () => ({ total: 41 }),
        all: async () => ({
          results: [
            {
              id: "POLL-1",
              title: "January Poll",
              created_at: "2026-01-01T00:00:00.000Z",
              nomination_deadline: "2026-01-05T00:00:00.000Z",
              voting_deadline: "2026-01-10T00:00:00.000Z",
              results_data: JSON.stringify({
                winner: {
                  author: "Author One",
                  title: "Book One",
                  link: "https://example.com/book-one",
                },
              }),
            },
          ],
        }),
        bind(...bindings) {
          call.bindings = bindings;
          return {
            all: async () => ({
              results: [
                {
                  id: "POLL-21",
                  title: "Poll 21",
                  tally_method: "chris-style",
                  created_at: "2026-01-01T00:00:00.000Z",
                },
              ],
            }),
          };
        },
      };
    },
  };

  return db;
}

describe("PollManager.getCompletedPollsPage", () => {
  it("queries completed non-test polls with a 20-row page offset", async () => {
    const db = createDatabaseMock();
    const pollManager = new PollManager({ POLLS_DB: db });

    const page = await pollManager.getCompletedPollsPage(2, 20);

    expect(page).toMatchObject({
      page: 2,
      pageSize: 20,
      totalPolls: 41,
      totalPages: 3,
    });
    expect(page.polls).toEqual([
      {
        id: "POLL-21",
        title: "Poll 21",
        tallyMethod: "chris-style",
        phase: "completed",
        createdAt: "2026-01-01T00:00:00.000Z",
        isTest: false,
      },
    ]);

    expect(db.calls).toHaveLength(2);
    expect(db.calls[0].sql).toContain(
      "WHERE phase = 'completed' AND is_test = 0",
    );
    expect(db.calls[1].sql).toContain("ORDER BY created_at DESC, id DESC");
    expect(db.calls[1].bindings).toEqual([20, 20]);
  });

  it("extracts winner and date fields for the CSV export", async () => {
    const db = createDatabaseMock();
    const pollManager = new PollManager({ POLLS_DB: db });

    const winners = await pollManager.getCompletedPollWinners();

    expect(winners).toEqual([
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
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toContain(
      "WHERE phase = 'completed' AND is_test = 0",
    );
  });
});
