import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/server/supabaseRequestIdentity", () => ({
  resolveIdentity: vi.fn(async () => ({ userId: "u1", email: "a@b.c" })),
  getDbForIdentity: vi.fn(() => mockDb),
  jsonUnauthorizedDetails: vi.fn(async () => ({ error: "Unauthorized" })),
}));

// Mutable query stubs, reset per test.
let pageRows: object[] = [];
let pageError: { message: string } | null = null;
let totalCount: number | null = null;
const seenRanges: [number, number][] = [];

const mockDb = {
  from: () => ({
    select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) {
        return {
          eq: () => Promise.resolve({ count: totalCount, error: null }),
        };
      }
      const chain = {
        eq: () => chain,
        order: () => chain,
        range: (from: number, to: number) => {
          seenRanges.push([from, to]);
          return Promise.resolve({ data: pageRows, error: pageError });
        },
      };
      return chain;
    },
  }),
};

function get(url: string) {
  return new Request(url, { headers: {} });
}

describe("/api/saved-prompts GET", () => {
  beforeEach(() => {
    pageRows = [{ id: "1" }, { id: "2" }];
    pageError = null;
    totalCount = 2;
    seenRanges.length = 0;
  });

  it("returns one bounded page with total and no next offset at the end", async () => {
    const res = await GET(get("http://localhost/api/saved-prompts"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      prompts: unknown[];
      nextOffset: number | null;
      total: number;
    };
    expect(json.prompts).toHaveLength(2);
    expect(json.total).toBe(2);
    expect(json.nextOffset).toBeNull();
    expect(seenRanges).toEqual([[0, 99]]);
  });

  it("clamps limit and computes the next offset", async () => {
    totalCount = 250;
    const res = await GET(
      get("http://localhost/api/saved-prompts?limit=9999&offset=100")
    );
    const json = (await res.json()) as {
      nextOffset: number | null;
      total: number;
    };
    expect(seenRanges).toEqual([[100, 199]]);
    expect(json.nextOffset).toBe(200);
    expect(json.total).toBe(250);
    expect(res.status).toBe(200);
  });

  it("maps missing-table errors to 503 with a migration hint", async () => {
    pageError = { message: "relation pp_saved_prompts does not exist" };
    const res = await GET(get("http://localhost/api/saved-prompts"));
    expect(res.status).toBe(503);
    const json = (await res.json()) as { code?: string; hint?: string };
    expect(json.code).toBe("LIBRARY_DB_ERROR");
    expect(json.hint).toMatch(/migrations/);
  });

  it("never leaks non-missing internal DB errors to the client (generic 500)", async () => {
    // Force the non-missing branch: message must NOT match the missing-table regex.
    pageError = { message: "permission denied for table pp_saved_prompts" };
    const res = await GET(get("http://localhost/api/saved-prompts"));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error?: string; code?: string };
    expect(json.error).toBe("Could not load prompts");
    expect(json.code).toBe("LIBRARY_DB_ERROR");
    expect(JSON.stringify(json)).not.toMatch(/permission denied/i);
  });
});
