import {
  formatNomination,
  formatPollFooterLine,
  formatNominations,
  formatPollFields,
  formatStatus,
} from "./format.js";
import { describe, it, expect, vi } from "vitest";

const mockPoll = {
  id: "test-poll-id",
  title: "Test Poll",
  phase: "nomination",
  nominationDeadline: new Date(Date.now() + 86400000).toISOString(),
  tallyMethod: "chris-style",
  nominations: [
    {
      title: "Book A",
      author: "Author A",
      link: "https://example.com/a",
      username: "UserA",
    },
    {
      title: "Book B",
      author: "Author B",
      link: "https://example.com/b",
      username: "UserB",
    },
  ],
  results: {
    totalVotes: 0,
  },
};

describe("formatNomination", () => {
  it("formats a nomination with all fields", () => {
    const nomination = {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      link: "https://example.com/gatsby",
      username: "testuser",
    };
    expect(formatNomination(nomination)).toBe(
      "[The Great Gatsby by F. Scott Fitzgerald](https://example.com/gatsby) (testuser)"
    );
  });

  it("formats a nomination without an author", () => {
    const nomination = {
      title: "Another Book",
      link: "https://example.com/another",
      username: "testuser2",
    };
    expect(formatNomination(nomination)).toBe(
      "[Another Book](https://example.com/another) (testuser2)"
    );
  });

  it("formats a nomination without the user", () => {
    const nomination = {
      title: "A Third Book",
      author: "Author C",
      link: "https://example.com/third",
      username: "testuser3",
    };
    expect(formatNomination(nomination, { includeUser: false })).toBe(
      "[A Third Book by Author C](https://example.com/third)"
    );
  });

  it('returns "Invalid nomination" for null input', () => {
    expect(formatNomination(null)).toBe("Invalid nomination");
  });
});

describe("formatPollFooterLine", () => {
  it("formats the poll footer", () => {
    expect(formatPollFooterLine({ id: "12345" })).toBe("Poll ID: 12345");
  });
});

describe("formatNominations", () => {
  it("formats a list of nominations", () => {
    const poll = {
      nominations: [
        {
          title: "Book 1",
          author: "Author 1",
          link: "https://example.com/1",
          username: "User1",
        },
        {
          title: "Book 2",
          author: "Author 2",
          link: "https://example.com/2",
          username: "User2",
        },
      ],
    };
    const expected =
      "1. [Book 1 by Author 1](https://example.com/1) (User1)\n" +
      "2. [Book 2 by Author 2](https://example.com/2) (User2)";
    expect(formatNominations(poll)).toBe(expected);
  });
});

describe("formatPollFields", () => {
  it("formats fields for nomination phase", () => {
    const poll = {
      phase: "nomination",
      nominationDeadline: "2025-01-01T00:00:00.000Z",
      tallyMethod: "chris-style",
      results: { totalVotes: 0 },
    };
    const fields = formatPollFields(poll);
    expect(fields).toHaveLength(3);
    expect(fields[0].value).toBe("Nomination");
    expect(fields[1].name).toBe("📅 Deadline");
  });

  it("formats fields for voting phase", () => {
    const poll = {
      phase: "voting",
      votingDeadline: "2025-01-02T00:00:00.000Z",
      tallyMethod: "ranked-choice",
      results: { totalVotes: 10 },
    };
    const fields = formatPollFields(poll);
    expect(fields).toHaveLength(4);
    expect(fields[0].value).toBe("Voting");
    expect(fields[1].name).toBe("📅 Deadline");
    expect(fields[3].value).toBe("10");
  });

  it("formats fields for completed phase", () => {
    const poll = {
      phase: "completed",
      tallyMethod: "chris-style",
      results: { totalVotes: 25 },
    };
    const fields = formatPollFields(poll);
    expect(fields).toHaveLength(3);
    expect(fields[0].value).toBe("Completed");
    expect(fields[2].value).toBe("25");
  });
});

describe("formatStatus", () => {
  it("formats the status embed for a nomination phase poll", () => {
    const embed = formatStatus(mockPoll, { header: "Status" });
    expect(embed.title).toBe("📚 Test Poll - Status");
    expect(embed.color).toBe(0x0099ff);
    expect(embed.fields).toHaveLength(4); // Phase, Deadline, Tally, Nominations
    expect(embed.footer.text).toBe("Poll ID: test-poll-id");
  });

  it("formats the status embed for a voting phase poll", () => {
    const votingPoll = {
      ...mockPoll,
      phase: "voting",
      votingDeadline: new Date(Date.now() + 86400000).toISOString(),
      results: { totalVotes: 5 },
    };
    const embed = formatStatus(votingPoll);
    expect(embed.title).toBe("📚 Test Poll");
    expect(embed.color).toBe(0xffaa00);
    expect(embed.fields).toHaveLength(5); // Phase, Deadline, Tally, Votes, Nominations
  });

  it("formats the status embed for a completed poll with a winner", () => {
    const completedPoll = {
      ...mockPoll,
      phase: "completed",
      results: {
        totalVotes: 10,
        winner: {
          title: "Book A",
          author: "Author A",
          link: "https://example.com/a",
          username: "UserA",
        },
      },
    };
    const embed = formatStatus(completedPoll);
    expect(embed.color).toBe(0x00ff00);
    expect(embed.fields).toHaveLength(5); // Phase, Tally, Votes, Winner, Nominations
    expect(embed.fields[3].name).toBe("🏆 Winner");
  });

  it("formats the status embed for a completed poll with a tie", () => {
    const tiePoll = {
      ...mockPoll,
      phase: "completed",
      tallyMethod: "chris-style",
      results: {
        totalVotes: 12,
        tie: true,
        tiedNominations: [
          {
            title: "Book A",
            author: "Author A",
            link: "https://example.com/a",
            username: "UserA",
          },
          {
            title: "Book C",
            author: "Author C",
            link: "https://example.com/c",
            username: "UserC",
          },
        ],
      },
    };
    const embed = formatStatus(tiePoll);
    expect(embed.color).toBe(0x00ff00);
    expect(embed.fields).toHaveLength(6); // Phase, Tally, Votes, Tie Detected, Tied Options, Nominations
    expect(embed.fields[3].name).toBe("⚠️ Tie Detected");
  });
});
