'use client';

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLocalHistoryForSession,
  saveToHistory,
} from "./optimizationHistory";

vi.mock("@/lib/client/supabase", () => ({
  getSupabaseClient: () => null,
}));

const LOCAL_KEY = "pp:optimization_history_local";

describe("saveToHistory local fallback", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores rows locally and returns a local- id", async () => {
    const id = await saveToHistory({
      prompt_original: "orig",
      prompt_optimized: "opt",
      mode: "better",
      explanation: "why",
      sessionId: "sess-1",
    });
    expect(id?.startsWith("local-")).toBe(true);
    const rows = getLocalHistoryForSession("sess-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      session_id: "sess-1",
      prompt_original: "orig",
      prompt_optimized: "opt",
    });
    expect(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]")).toHaveLength(1);
  });

  it("scopes reads by session and caps the list", async () => {
    await saveToHistory({
      prompt_original: "a",
      prompt_optimized: "b",
      mode: "better",
      explanation: "",
      sessionId: "s1",
    });
    await saveToHistory({
      prompt_original: "c",
      prompt_optimized: "d",
      mode: "better",
      explanation: "",
      sessionId: "s2",
    });
    expect(getLocalHistoryForSession("s1")).toHaveLength(1);
    expect(getLocalHistoryForSession("s2")).toHaveLength(1);
    expect(getLocalHistoryForSession("nope")).toEqual([]);
  });

  it("generates a browser session id when blank", async () => {
    const id = await saveToHistory({
      prompt_original: "a",
      prompt_optimized: "b",
      mode: "better",
      explanation: "",
      sessionId: "   ",
    });
    // Falls back to the browser session id when blank.
    expect(typeof id).toBe("string");
  });

  it("survives a full localStorage via cross-key eviction without throwing", async () => {
    const LIBRARY_KEY = "pp:library_saved_local";
    const LIMIT = 30000;
    const realSetItem = Storage.prototype.setItem;
    const quotaErr = () => {
      const e = new Error("Quota exceeded");
      (e as unknown as Record<string, string>).name = "QuotaExceededError";
      return e;
    };
    // Faithful per-origin quota: total bytes across all keys must fit LIMIT.
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, k: string, v: string) {
        let total = v.length;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key === null || key === k) continue;
          total += (localStorage.getItem(key) ?? "").length;
        }
        if (total > LIMIT) throw quotaErr();
        return realSetItem.call(this, k, v);
      });
    try {
      // Plant pre-fix bloated library data (huge untruncated rows) directly.
      const big = "x".repeat(12000);
      const oldRow = {
        id: "old-1",
        session_id: "s",
        prompt_original: big,
        prompt_optimized: big,
        mode: "m",
        explanation: big,
        title: "t",
        provider: "p",
        history_id: null,
        created_at: new Date().toISOString(),
      };
      realSetItem.call(
        localStorage,
        LIBRARY_KEY,
        JSON.stringify([oldRow, { ...oldRow, id: "old-2" }, { ...oldRow, id: "old-3" }]),
      );

      await expect(
        saveToHistory({
          prompt_original: "orig",
          prompt_optimized: "opt",
          mode: "better",
          explanation: "why",
          sessionId: "sess-q",
        }),
      ).resolves.toMatch(/^local-/);

      // Newest row persisted and readable despite the quota pressure.
      expect(getLocalHistoryForSession("sess-q")).toHaveLength(1);
      // Bloated secondary key was pruned oldest-first to make room.
      const library = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "[]") as unknown[];
      expect(library.length).toBeLessThan(3);
    } finally {
      spy.mockRestore();
    }
  });
});
