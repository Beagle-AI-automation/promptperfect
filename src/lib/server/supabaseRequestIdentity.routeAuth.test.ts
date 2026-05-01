import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveIdentity } from "./supabaseRequestIdentity";

vi.mock("@/lib/server/supabase", () => ({
  createRouteHandlerClient: vi.fn(),
}));

import { createRouteHandlerClient } from "@/lib/server/supabase";

describe("resolveIdentity (cookie session)", () => {
  beforeEach(() => {
    vi.mocked(createRouteHandlerClient).mockReset();
  });

  it("returns user from Supabase cookie session", async () => {
    vi.mocked(createRouteHandlerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "u1", email: "a@b.com" } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "jwt-here" } },
        }),
      },
    } as never);

    const id = await resolveIdentity(new Request("http://localhost/x"));
    expect(id).toEqual({
      userId: "u1",
      email: "a@b.com",
      token: "jwt-here",
    });
  });

  it("returns undefined when no cookie user and no Authorization header", async () => {
    vi.mocked(createRouteHandlerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
        getSession: vi.fn(),
      },
    } as never);

    expect(
      await resolveIdentity(new Request("http://localhost/x")),
    ).toBeUndefined();
  });
});
