import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/server/supabase", () => ({
  getServiceClient: () => null,
}));

vi.mock("@/lib/providers", () => ({
  createProvider: () => ({
    model: {},
    modelId: "test-model",
  }),
}));

const streamText = vi.fn();
vi.mock("ai", () => ({
  streamText: (...args: unknown[]) => streamText(...args),
}));

describe("/api/optimize POST", () => {
  beforeEach(() => {
    streamText.mockReset();
    // NOTE: ai v6 `streamText` returns the result object synchronously.
    streamText.mockReturnValue({
      toTextStreamResponse: () => new Response("streamed-output"),
    });
  });

  it("streams output for a valid prompt", async () => {
    const res = await POST(
      new Request("http://localhost/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello world", mode: "better" }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("streamed-output");
    expect(streamText).toHaveBeenCalledTimes(1);
    const firstCall = streamText.mock.calls[0];
    expect(firstCall).toBeDefined();
    const call = (firstCall?.[0] ?? {}) as { prompt?: string };
    expect(call.prompt).toBe("Hello world");
  });

  it("returns 400 for missing prompt", async () => {
    const res = await POST(
      new Request("http://localhost/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "better" }),
      })
    );
    expect(res.status).toBe(400);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 400 for oversized prompt", async () => {
    const res = await POST(
      new Request("http://localhost/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "x".repeat(100_001) }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("throttles an IP that exceeds the per-minute budget", async () => {
    // 20 requests per minute are allowed; without a BYOK key the route would
    // otherwise spend the server's own provider quota on every call.
    const ip = "198.51.100.7";
    const req = () =>
      new Request("http://localhost/api/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({ prompt: "Hello world", mode: "better" }),
      });

    let last: Response | undefined;
    for (let i = 0; i < 20; i++) {
      last = await POST(req());
      expect(last.status).toBe(200);
    }

    const blocked = await POST(req());
    expect(blocked.status).toBe(429);
    expect(streamText).toHaveBeenCalledTimes(20);
  });
});
