import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/client/supabase", () => ({
  getSupabaseAdminClient: () => null,
}));

const getUserMock = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  createRouteHandlerClient: vi.fn(async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
  })),
}));

/**
 * Guest demo usage is tracked via `record-demo-usage` (sessionId + tokensConsumed).
 * Signed-in users are identified from the session cookie (no body userId).
 */
describe("/api/record-demo-usage", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("returns 400 when not signed in and no sessionId", async () => {
    const req = new Request("http://localhost/api/record-demo-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokensConsumed: 10 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toMatch(/sign in or provide sessionId/i);
  });

  it("returns ok when tokensConsumed is zero without hitting the database", async () => {
    const req = new Request("http://localhost/api/record-demo-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "guest-sess-1", tokensConsumed: 0 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean };
    expect(json.ok).toBe(true);
  });

  it("accepts guest sessionId with positive token count when DB is unavailable", async () => {
    const req = new Request("http://localhost/api/record-demo-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "guest-sess-2", tokensConsumed: 5 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean };
    expect(json.ok).toBe(true);
  });

  it("uses session user id when signed in without sessionId", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
      error: null,
    });
    const req = new Request("http://localhost/api/record-demo-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokensConsumed: 3 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
