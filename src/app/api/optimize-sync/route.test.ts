import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("/api/optimize-sync", () => {
  beforeEach(() => {
    generateText.mockReset();
    generateText.mockResolvedValue({
      text: "Optimized output\n---EXPLANATION---\nBecause",
    });
  });

  it("OPTIONS returns CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type"
    );
  });

  it("POST returns 400 when prompt and text are missing", async () => {
    const req = new Request("http://localhost/api/optimize-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "better", provider: "gemini" }),
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toMatch(/prompt or text is required/i);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("POST returns optimized payload for valid body", async () => {
    const req = new Request("http://localhost/api/optimize-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Hello world",
        mode: "better",
        provider: "gemini",
      }),
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const json = (await res.json()) as { optimizedText?: string };
    expect(json.optimizedText).toContain("Optimized");
    expect(generateText).toHaveBeenCalled();
  });
});
