import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/client/supabase", () => ({
  getSupabaseAdminClient: () => null,
}));

/**
 * Guest demo usage is tracked via `record-demo-usage` (sessionId + tokensConsumed).
 * There is no separate `/api/guest-usage` route in this codebase.
 */
describe("/api/record-demo-usage", () => {
  it("returns 400 when neither userId nor sessionId is provided", async () => {
    const req = new Request("http://localhost/api/record-demo-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokensConsumed: 10 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toMatch(/userId or sessionId/i);
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
});
