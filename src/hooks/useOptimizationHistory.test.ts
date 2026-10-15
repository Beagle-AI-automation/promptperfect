'use client';

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOptimizationHistory } from "./useOptimizationHistory";

vi.mock("@/lib/client/supabaseBrowser", () => ({
  createSupabaseBrowserClient: () => mockBrowserClient,
}));

// Swapped per test via the mutable binding above.
let mockBrowserClient: unknown = null;

vi.mock("@/lib/client/promptPerfectAuthHeaders", () => ({
  getPromptPerfectAuthHeaders: async () => ({ Authorization: "Bearer test" }),
}));

const LOCAL_KEY = "pp:optimization_history_local";

function seedLocal(rows: object[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

function localRow(id: string, createdAt: string, prompt = `prompt ${id}`) {
  return {
    id,
    session_id: "s1",
    prompt_original: prompt,
    prompt_optimized: `opt ${id}`,
    mode: "better",
    explanation: "",
    created_at: createdAt,
  };
}

describe("useOptimizationHistory", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    mockBrowserClient = null;
  });

  it("loads guest rows from localStorage newest-first without a backend", async () => {
    seedLocal([
      localRow("old", "2026-01-01T00:00:00Z"),
      localRow("new", "2026-02-01T00:00:00Z"),
    ]);
    const { result } = renderHook(() =>
      useOptimizationHistory({ historySessionId: "s1" })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("merges account, session and library sources for signed-in users", async () => {
    const sessionRow = {
      id: "sess-1",
      session_id: "s1",
      prompt_original: "session prompt",
      prompt_optimized: "o",
      mode: "better",
      explanation: "",
      created_at: "2026-01-05T00:00:00Z",
    };
    mockBrowserClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [sessionRow], error: null }),
            }),
          }),
        }),
      }),
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/history")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              localRow("api-1", "2026-03-01T00:00:00Z", "api prompt"),
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({ prompts: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useOptimizationHistory({ userId: "u1", historySessionId: "s1" })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows.map((r) => r.id)).toEqual(["api-1", "sess-1"]);
  });

  it("follows library pages until nextOffset is null", async () => {
    mockBrowserClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        seen.push(String(url));
        if (String(url).includes("/api/history")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        const offset = Number(
          new URL(String(url), "http://test").searchParams.get("offset") ?? 0
        );
        const libRow = (
          id: string,
          createdAt: string,
          prompt: string
        ) => ({
          id,
          title: `t-${id}`,
          original_prompt: prompt,
          optimized_prompt: `opt ${id}`,
          explanation: "",
          mode: "better",
          created_at: createdAt,
        });
        return {
          ok: true,
          json: async () =>
            offset === 0
              ? {
                  prompts: [libRow("p1", "2026-03-01T00:00:00Z", "page one")],
                  nextOffset: 1,
                  total: 2,
                }
              : {
                  prompts: [libRow("p2", "2026-02-01T00:00:00Z", "page two")],
                  nextOffset: null,
                  total: 2,
                },
        };
      })
    );
    const { result } = renderHook(() =>
      useOptimizationHistory({ userId: "u1", historySessionId: "s1" })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows.map((r) => r.id)).toEqual(["lib-p1", "lib-p2"]);
    expect(seen.filter((u) => u.includes("/api/saved-prompts"))).toHaveLength(2);
  });

  it("deletes via the API, notifies and reloads", async () => {    mockBrowserClient = {};
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const onDeleted = vi.fn();

    const { result } = renderHook(() =>
      useOptimizationHistory({ userId: "u1", onDeleted })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.removeItem("api-1");
    });
    expect(ok).toBe(true);
    expect(onDeleted).toHaveBeenCalledWith("api-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/history?id=api-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("surfaces API delete errors without notifying", async () => {
    mockBrowserClient = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "gone" }),
      }))
    );
    const onDeleted = vi.fn();
    const { result } = renderHook(() =>
      useOptimizationHistory({ userId: "u1", onDeleted })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.removeItem("api-1");
    });
    expect(ok).toBe(false);
    expect(onDeleted).not.toHaveBeenCalled();
    expect(result.current.deleteError).toBe("gone");
  });
});
