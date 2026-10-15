import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const generateText = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  createRouteHandlerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "test-user", email: "t@e.c" } },
        error: null,
      }),
    },
  }),
}));

vi.mock("@/lib/providers", () => ({
  createProvider: () => ({ model: {}, modelId: "test-model" }),
  hasServerKey: () => false,
}));

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateText(...args),
}));

function post(body: unknown) {
  return new Request("http://localhost/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/translate POST", () => {
  beforeEach(() => {
    generateText.mockReset();
    generateText.mockResolvedValue({ text: "Hola mundo" });
    delete process.env.NEXT_PUBLIC_UNLIMITED_MODE;
  });

  it("translates valid text (BYOK path needs no session)", async () => {
    const res = await POST(
      post({ text: "Hello world", targetLang: "es", apiKey: "sk-x" })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { translatedText?: string };
    expect(json.translatedText).toBe("Hola mundo");
    expect(generateText).toHaveBeenCalledTimes(1);
    const firstCall = generateText.mock.calls[0];
    expect(firstCall).toBeDefined();
    const call = (firstCall?.[0] ?? {}) as { system?: string };
    expect(call.system).toMatch(/Spanish/);
  });

  it("rejects missing text, bad target and oversized input", async () => {
    expect((await POST(post({ targetLang: "es" }))).status).toBe(400);
    expect(
      (await POST(post({ text: "hi", targetLang: "fr" }))).status
    ).toBe(400);
    expect(
      (await POST(post({ text: "x".repeat(50_001), targetLang: "es" }))).status
    ).toBe(400);
    expect(generateText).not.toHaveBeenCalled();
  });
});
