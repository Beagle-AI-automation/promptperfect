import { describe, it, expect, vi, afterEach } from "vitest";
import * as auth from "@/lib/server/supabaseRequestIdentity";
import { GET } from "./saved-prompts/status/route";

describe("API session auth (/api/saved-prompts/status)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.spyOn(auth, "resolveIdentity").mockResolvedValue(undefined);
    vi.spyOn(auth, "jsonUnauthorizedDetails").mockResolvedValue({
      error: "Unauthorized",
      hint: "No session",
      code: "NO_CREDENTIALS",
    });

    const res = await GET(
      new Request("http://localhost/api/saved-prompts/status"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 when authenticated and history_id is absent", async () => {
    vi.spyOn(auth, "resolveIdentity").mockResolvedValue({
      userId: "00000000-0000-4000-8000-000000000001",
      email: "t@example.com",
      token: "tok",
    });

    vi.spyOn(auth, "getDbForIdentity").mockReturnValue({} as never);

    const res = await GET(
      new Request("http://localhost/api/saved-prompts/status"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: false });
  });

  it("returns 401 with BEARER_REJECTED details when bearer is invalid", async () => {
    vi.spyOn(auth, "resolveIdentity").mockResolvedValue(undefined);
    vi.spyOn(auth, "jsonUnauthorizedDetails").mockResolvedValue({
      error: "Unauthorized",
      hint: "Bearer rejected",
      code: "BEARER_REJECTED",
    });

    const res = await GET(
      new Request("http://localhost/api/saved-prompts/status", {
        headers: { Authorization: "Bearer invalid.jwt.here" },
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("BEARER_REJECTED");
  });
});
