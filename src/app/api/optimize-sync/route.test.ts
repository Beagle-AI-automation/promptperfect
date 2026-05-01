import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { POST, OPTIONS } from "./route";

const generateText = vi.fn();

vi.mock("@/lib/client/supabase", () => ({
  getSupabaseAdminClient: () => null,
}));

vi.mock("@/lib/providers", () => ({
  createProvider: () => ({
    model: {},
    modelId: "test-model",
  }),
}));

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateText(...args),
}));

function asNextRequest(init: RequestInit & { url?: string }) {
  const { url = "http://localhost/api/optimize-sync", ...rest } = init;
  return new Request(url, rest) as NextRequest;
}

describe("/api/optimize-sync", () => {
  beforeEach(() => {
    generateText.mockReset();
    generateText.mockResolvedValue({
      text: "Optimized output\n---EXPLANATION---\nBecause",
    });
    delete process.env.ALLOWED_ORIGINS;
  });

  it("OPTIONS returns CORS headers for default allowlist", async () => {
    const res = await OPTIONS(asNextRequest({ method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type",
    );
  });

  it("OPTIONS echoes Origin when it is in the allowlist", async () => {
    const res = await OPTIONS(
      asNextRequest({
        method: "OPTIONS",
        headers: {
          Origin: "https://promptperfect.vercel.app",
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://promptperfect.vercel.app",
    );
  });

  it("POST returns 400 when prompt and text are missing", async () => {
    const req = asNextRequest({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "better", provider: "gemini" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toMatch(/prompt or text is required/i);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
  });

  it("POST returns optimized payload for valid body", async () => {
    const req = asNextRequest({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Hello world",
        mode: "better",
        provider: "gemini",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
    const json = (await res.json()) as { optimizedText?: string };
    expect(json.optimizedText).toContain("Optimized");
    expect(generateText).toHaveBeenCalled();
  });
});
