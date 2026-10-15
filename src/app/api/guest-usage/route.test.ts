import { describe, it, expect, vi, beforeEach } from "vitest";
import { GUEST_LIMIT } from "@/lib/guest";
import * as supabaseLib from "@/lib/server/supabase";
import { GET, POST } from "./route";
import { resetRateLimits } from "@/lib/auth/rateLimit";

vi.mock("@/lib/server/supabase", () => ({
  getServiceClient: vi.fn(),
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

/** Unique IP per test so the in-memory limiter never bleeds between cases. */
let ipSeed = 0;
function nextIp(): string {
  ipSeed += 1;
  return `203.0.113.${ipSeed}`;
}

function postRequest(ip: string): Request {
  return new Request("http://localhost/api/guest-usage", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ guestId: "guest_test123" }),
  });
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
    vi.mocked(supabaseLib.getServiceClient).mockReset();
    resetRateLimits();
  });

  it("returns 400 when guestId is missing", async () => {
    const client = buildGuestUsageClient();
    vi.mocked(supabaseLib.getServiceClient).mockReturnValue(
      client as unknown as NonNullable<
        ReturnType<typeof supabaseLib.getServiceClient>
      >,
    );

    const res = await POST(
      new Request("http://localhost/api/guest-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": nextIp() },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Guest ID required/i);
  });

  it("returns 503 when Supabase is not configured", async () => {
    vi.mocked(supabaseLib.getServiceClient).mockReturnValue(null);

    const res = await POST(postRequest(nextIp()));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/Database not configured/i);
  });

  it("throttles an anonymous IP that exceeds the per-minute budget", async () => {
    vi.mocked(supabaseLib.getServiceClient).mockReturnValue(null);

    const ip = nextIp();
    // 30 requests per minute are allowed; the throttle fires before any
    // Supabase work, so the 31st must be rejected with a 429.
    let last: Response | undefined;
    for (let i = 0; i < 30; i++) {
      last = await POST(postRequest(ip));
      expect(last.status).toBe(503);
    }

    const blocked = await POST(postRequest(ip));
    expect(blocked.status).toBe(429);
    const data = await blocked.json();
    expect(data.error).toMatch(/too many requests/i);
  });
});
