import { describe, it, expect, beforeEach } from "vitest";
import { configIssues, getConfig, resetConfigCache } from "./config";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "PROMPTPERFECT_OPENAI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_MODEL",
  "NEXT_PUBLIC_UNLIMITED_MODE",
  "NEXT_PUBLIC_GUEST_TOKEN_LIMIT",
  "NEXT_PUBLIC_SITE_URL",
  "ALLOWED_ORIGINS",
];

describe("getConfig", () => {
  beforeEach(() => {
    for (const k of KEYS) delete process.env[k];
    resetConfigCache();
  });

  it("reports null backends when nothing is configured", () => {
    const c = getConfig();
    expect(c.supabase).toBeNull();
    expect(c.aiKeys).toEqual({ gemini: null, openai: null, anthropic: null });
    expect(c.geminiModel).toBe("gemini-3.5-flash");
    expect(c.flags.unlimitedMode).toBe(false);
    expect(c.flags.guestTokenLimit).toBe(5);
    expect(configIssues().length).toBeGreaterThan(0);
  });

  it("prefers app-specific keys and validates flags", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.PROMPTPERFECT_OPENAI_API_KEY = "sk-app";
    process.env.OPENAI_API_KEY = "sk-shell";
    process.env.NEXT_PUBLIC_UNLIMITED_MODE = "1";
    process.env.NEXT_PUBLIC_GUEST_TOKEN_LIMIT = "50";
    process.env.ALLOWED_ORIGINS = "https://a.test, http://localhost:3000/";
    const c = getConfig();
    expect(c.supabase?.url).toBe("https://abc.supabase.co");
    expect(c.aiKeys.openai).toBe("sk-app");
    expect(c.flags.unlimitedMode).toBe(true);
    expect(c.flags.guestTokenLimit).toBe(50);
    expect(c.flags.allowedOrigins).toEqual([
      "https://a.test",
      "http://localhost:3000",
    ]);
  });

  it("treats placeholder Supabase URLs as unconfigured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(getConfig().supabase).toBeNull();
  });
});
