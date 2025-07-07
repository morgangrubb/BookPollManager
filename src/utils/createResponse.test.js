import { createResponse } from "./createResponse";
import { describe, it, expect } from "vitest";

describe("createResponse", () => {
  it("should create a non-ephemeral response by default", async () => {
    const response = createResponse({ content: "hello" });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(data).toEqual({
      type: 4,
      data: {
        content: "hello",
        flags: 0,
      },
    });
  });

  it("should create an ephemeral response when ephemeral is true", async () => {
    const response = createResponse({ content: "hello", ephemeral: true });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(data).toEqual({
      type: 4,
      data: {
        content: "hello",
        flags: 64,
      },
    });
  });

  it("should handle additional data properties", async () => {
    const response = createResponse({
      content: "test message",
      embeds: [{ title: "Test Embed" }],
    });
    const data = await response.json();
    expect(data.data.content).toBe("test message");
    expect(data.data.embeds).toEqual([{ title: "Test Embed" }]);
  });
});
