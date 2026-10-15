import { describe, it, expect } from "vitest";
import {
  MAX_PAGE_LIMIT,
  nextOffset,
  parseLimit,
  parseOffset,
} from "./pagination";

describe("pagination helpers", () => {
  it("parses and clamps limit", () => {
    expect(parseLimit(null)).toBe(25);
    expect(parseLimit("")).toBe(25);
    expect(parseLimit("10")).toBe(10);
    expect(parseLimit("0")).toBe(1);
    expect(parseLimit("9999")).toBe(MAX_PAGE_LIMIT);
    expect(parseLimit("abc")).toBe(25);
    expect(parseLimit("12.9")).toBe(12);
  });

  it("parses offset floored at 0", () => {
    expect(parseOffset(null)).toBe(0);
    expect(parseOffset("25")).toBe(25);
    expect(parseOffset("-5")).toBe(0);
    expect(parseOffset("abc")).toBe(0);
  });

  it("computes the next offset or null at the end", () => {
    expect(nextOffset(0, 25, 100)).toBe(25);
    expect(nextOffset(75, 25, 100)).toBeNull();
    expect(nextOffset(0, 25, 25)).toBeNull();
    expect(nextOffset(0, 25, 0)).toBeNull();
  });
});
