import { describe, expect, it } from "vitest";
import { renderPollsPage } from "./pollsPage.js";

describe("renderPollsPage", () => {
  it("renders poll links, start dates, and next-page navigation", () => {
    const html = renderPollsPage({
      polls: [
        {
          id: "NEW123",
          title: "Newest <Poll>",
          createdAt: "2026-09-25T12:00:00.000Z",
        },
        {
          id: "OLD456",
          title: "Older Poll",
          createdAt: "2026-08-25T12:00:00.000Z",
        },
      ],
      page: 1,
      totalPages: 2,
      totalPolls: 22,
    });

    expect(html).toContain("22 completed non-test polls");
    expect(html).toContain('href="/polls.csv"');
    expect(html).toContain("Download winners as CSV");
    expect(html).toContain('href="/poll/NEW123"');
    expect(html).toContain("Newest &lt;Poll&gt;");
    expect(html).toContain('datetime="2026-09-25T12:00:00.000Z"');
    expect(html).toContain("2026-09-25");
    expect(html).toContain('href="/polls?page=2"');
    expect(html).toContain("Next");
    expect(html).toContain("Page 1 of 2");
    expect(html).not.toContain('href="/polls?page=0"');
  });

  it("renders previous-page navigation on later pages", () => {
    const html = renderPollsPage({
      polls: [{ id: "P21", title: "Poll 21", createdAt: "2020-01-01" }],
      page: 2,
      totalPages: 2,
      totalPolls: 21,
    });

    expect(html).toContain('href="/polls?page=1"');
    expect(html).toContain("Previous");
    expect(html).toContain("Page 2 of 2");
    expect(html).toContain('<span class="disabled">Next</span>');
  });

  it("shows an empty state when there are no completed polls", () => {
    const html = renderPollsPage({
      polls: [],
      page: 1,
      totalPages: 1,
      totalPolls: 0,
    });

    expect(html).toContain("No completed polls yet");
    expect(html).not.toContain("<table>");
  });
});
