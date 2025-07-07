import { getOptionValue } from "./getOptionValue";
import { describe, it, expect } from "vitest";

describe("getOptionValue", () => {
  const options = [
    { name: "option1", value: "value1" },
    { name: "option2", value: 123 },
    { name: "option3", value: true },
  ];

  it("should return the value of a string option", () => {
    expect(getOptionValue(options, "option1")).toBe("value1");
  });

  it("should return the value of a number option", () => {
    expect(getOptionValue(options, "option2")).toBe(123);
  });

  it("should return the value of a boolean option", () => {
    expect(getOptionValue(options, "option3")).toBe(true);
  });

  it("should return undefined for a non-existent option", () => {
    expect(getOptionValue(options, "nonexistent")).toBeUndefined();
  });

  it("should return null if options array is null or undefined", () => {
    expect(getOptionValue(null, "option1")).toBeNull();
    expect(getOptionValue(undefined, "option1")).toBeNull();
  });

  it("should return null if name is null or undefined", () => {
    expect(getOptionValue(options, null)).toBeNull();
    expect(getOptionValue(options, undefined)).toBeNull();
  });

  it("should handle an empty options array", () => {
    expect(getOptionValue([], "option1")).toBeUndefined();
  });
});
