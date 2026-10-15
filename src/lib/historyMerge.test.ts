import { describe, it, expect } from "vitest";
import {
  formatHistoryTime,
  mapLibraryRowToHistory,
  mergeHistoryLists,
  previewPrompt,
  sortByNewest,
  type OptimizationHistoryItem,
} from "./historyMerge";

function row(overrides: Partial<OptimizationHistoryItem> = {}): OptimizationHistoryItem {
  return {
    id: `id-${Math.random().toString(36).slice(2)}`,
    session_id: "sess",
    prompt_original: "original prompt",
    prompt_optimized: "optimized prompt",
    mode: "better",
    explanation: "",
    created_at: "2026-01-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("sortByNewest", () => {
  it("orders newest first, caps, and sinks invalid dates", () => {
    const rows = [
      row({ id: "old", created_at: "2026-01-01T00:00:00Z" }),
      row({ id: "new", created_at: "2026-03-01T00:00:00Z" }),
      row({ id: "bad", created_at: "not-a-date" }),
    ];
    expect(sortByNewest(rows, 10).map((r) => r.id)).toEqual([
      "new",
      "old",
      "bad",
    ]);
    expect(sortByNewest(rows, 2)).toHaveLength(2);
  });
});

describe("mergeHistoryLists", () => {
  it("dedups by id and skips library rows matching a history prompt", () => {
    const api = [row({ id: "a1", prompt_original: "same prompt" })];
    const session = [
      row({ id: "a1", prompt_original: "same prompt" }),
      row({ id: "s1", prompt_original: "session only" }),
    ];
    const lib = [
      row({ id: "lib-x", prompt_original: "same prompt" }),
      row({ id: "lib-y", prompt_original: "saved only" }),
    ];
    const merged = mergeHistoryLists(api, session, lib, 50);
    expect(merged.map((r) => r.id).sort()).toEqual(["a1", "lib-y", "s1"].sort());
  });

  it("keeps library rows with empty prompts (no false dedup)", () => {
    const merged = mergeHistoryLists(
      [],
      [],
      [row({ id: "lib-e", prompt_original: "   " })],
      50
    );
    expect(merged.map((r) => r.id)).toEqual(["lib-e"]);
  });
});

describe("mapLibraryRowToHistory", () => {
  it("prefixes lib- ids and nulls the optimize session", () => {
    const mapped = mapLibraryRowToHistory({
      id: "42",
      title: "t",
      original_prompt: "o",
      optimized_prompt: "p",
      explanation: "e",
      mode: "better",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(mapped.id).toBe("lib-42");
    expect(mapped.optimize_session_id).toBeNull();
  });
});

describe("formatHistoryTime / previewPrompt", () => {
  it("formats valid dates and passes through garbage", () => {
    expect(formatHistoryTime("not-a-date")).toBe("not-a-date");
    expect(formatHistoryTime("2026-01-02T10:00:00.000Z")).toMatch(/Jan|janv|ene/i);
  });

  it("truncates long previews", () => {
    expect(previewPrompt("short")).toBe("short");
    expect(previewPrompt("x".repeat(100))).toBe(`${"x".repeat(60)}…`);
  });
});
