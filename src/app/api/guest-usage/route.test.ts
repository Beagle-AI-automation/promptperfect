import { describe, it, expect, vi, beforeEach } from "vitest";
import { GUEST_LIMIT } from "@/lib/guest";
import * as supabaseLib from "@/lib/supabase";
import { GET, POST } from "./route";

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

function buildGuestUsageClient() {
  const upsert = vi.fn().mockResolvedValue({});
  const single = vi
    .fn()
    .mockResolvedValue({ data: { optimization_count: 0 } });
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single,
      })),
    })),
    upsert,
  }));
  return { from, upsert, single };
}

describe("/api/guest-usage GET", () => {
  it("returns default count and limit when guestId is missing", async () => {
    const res = await GET(new Request("http://localhost/api/guest-usage"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(0);
    expect(data.limit).toBe(GUEST_LIMIT);
    expect(data.remaining).toBe(GUEST_LIMIT);
  });
});

describe("/api/guest-usage POST", () => {
  beforeEach(() => {
    vi.mocked(supabaseLib.getSupabaseClient).mockReset();
  });

  it("returns 400 when guestId is missing", async () => {
    const client = buildGuestUsageClient();
    vi.mocked(supabaseLib.getSupabaseClient).mockReturnValue(
      client as unknown as NonNullable<
        ReturnType<typeof supabaseLib.getSupabaseClient>
      >,
    );

    const res = await POST(
      new Request("http://localhost/api/guest-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Guest ID required/i);
  });

  it("returns 503 when Supabase is not configured", async () => {
    vi.mocked(supabaseLib.getSupabaseClient).mockReturnValue(null);

    const res = await POST(
      new Request("http://localhost/api/guest-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: "guest_test123" }),
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/Database not configured/i);
  });
});
