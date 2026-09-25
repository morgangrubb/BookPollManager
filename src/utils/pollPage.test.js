import { describe, expect, it } from "vitest";
import { renderPollPage } from "./pollPage.js";

describe("renderPollPage", () => {
  it("renders every nomination with the final Chris-style points tally", () => {
    const html = renderPollPage({
      title: "September Poll",
      createdAt: "2026-09-01T00:00:00.000Z",
      tallyMethod: "chris-style",
      nominations: [
        { id: 1, title: "Book A", author: "Author A" },
        { id: 2, title: "Book B", author: "Author B" },
        { id: 3, title: "Book C", author: "Author C" },
      ],
      results: {
        winner: { id: 2, title: "Book B", author: "Author B" },
        totalVotes: 4,
        standings: [
          { nomination: { id: 2, title: "Book B" }, points: 8 },
          { nomination: { id: 1, title: "Book A" }, points: 3 },
        ],
      },
    });

    expect(html).toContain("September Poll");
    expect(html).toContain("Final points tally");
    expect(html).toContain("Votes cast: 4");
    expect(html).toContain("Book A");
    expect(html).toContain("Book B");
    expect(html).toContain("Book C");
    expect(html).toContain(">8</td>");
    expect(html).toContain(">3</td>");
    expect(html).toContain(">0</td>");

    const bookBIndex = html.indexOf("Book B");
    const bookAIndex = html.indexOf("Book A");
    const bookCIndex = html.indexOf("Book C");
    expect(bookBIndex).toBeLessThan(bookAIndex);
    expect(bookAIndex).toBeLessThan(bookCIndex);
  });

  it("includes nominations represented only in stored historical results", () => {
    const html = renderPollPage({
      title: "Historical Poll",
      tallyMethod: "chris-style",
      nominations: [],
      results: {
        winner: { title: "Historical Book", author: "Historical Author" },
        standings: [
          {
            nomination: {
              title: "Historical Book",
              author: "Historical Author",
            },
            points: 0,
          },
        ],
      },
    });

    expect(html).toContain("Historical Book");
    expect(html).toContain("Historical Author");
    expect(html).toContain("Final points tally");
  });

  it("escapes nomination content and only links to http(s) book URLs", () => {
    const html = renderPollPage({
      title: "Safe Poll",
      tallyMethod: "chris-style",
      nominations: [
        {
          id: 1,
          title: "<script>alert(1)</script>",
          author: "A & B",
          link: 'javascript:alert("xss")',
        },
      ],
      results: {
        standings: [
          {
            nomination: { id: 1, title: "<script>alert(1)</script>" },
            points: 2,
          },
        ],
      },
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("A &amp; B");
  });

  it("renders ranked-choice nominations in final order", () => {
    const bookA = { id: 1, title: "Book A" };
    const bookB = { id: 2, title: "Book B" };
    const bookC = { id: 3, title: "Book C" };
    const html = renderPollPage({
      title: "Ranked Poll",
      tallyMethod: "ranked-choice",
      nominations: [bookA, bookB, bookC],
      results: {
        winner: bookB,
        rounds: [{ eliminated: bookC }, { eliminated: bookA }],
      },
    });

    expect(html).toContain("Final ranked-choice tally");
    expect(html).toContain("Ranked-choice polls do not use points");
    expect(html.indexOf("Book B")).toBeLessThan(html.indexOf("Book A"));
    expect(html.indexOf("Book A")).toBeLessThan(html.indexOf("Book C"));
  });
});
