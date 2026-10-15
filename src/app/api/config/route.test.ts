import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { resetConfigCache } from "@/lib/config";

const KEYS = [
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "PROMPTPERFECT_OPENAI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_UNLIMITED_MODE",
];

describe("/api/config GET", () => {
  beforeEach(() => {
    for (const k of KEYS) delete process.env[k];
    resetConfigCache();
  });

  it("reports provider availability without leaking keys", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "g-key";
    process.env.PROMPTPERFECT_OPENAI_API_KEY = "sk-app";
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      providers: Record<string, boolean>;
      models: Record<string, string>;
      unlimited: boolean;
    };
    expect(json.providers).toEqual({
      gemini: true,
      openai: true,
      anthropic: false,
    });
    expect(json.models.openai).toBe("gpt-6-astra");
    expect(JSON.stringify(json)).not.toContain("g-key");
    expect(JSON.stringify(json)).not.toContain("sk-app");
  });

  it("reflects an empty backend", async () => {
    const res = await GET();
    const json = (await res.json()) as {
      providers: Record<string, boolean>;
    };
    expect(json.providers).toEqual({
      gemini: false,
      openai: false,
      anthropic: false,
    });
  });
});
