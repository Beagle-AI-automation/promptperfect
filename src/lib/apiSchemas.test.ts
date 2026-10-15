import { describe, it, expect } from "vitest";
import {
  parseClaimGuestHistoryBody,
  parseFeedbackBody,
  parseLoginBody,
  parseMode,
  parseOptimizeBody,
  parseProvider,
  parseSaveHistoryBody,
  parseTranslateBody,
  parseUpdateUserBody,
} from "./apiSchemas";

describe("parseLoginBody", () => {
  it("lowercases the email and keeps the original casing for rawEmail", () => {
    const r = parseLoginBody({ email: "  User@Example.COM ", password: "secret" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("user@example.com");
      expect(r.value.rawEmail).toBe("User@Example.COM");
      expect(r.value.password).toBe("secret");
    }
  });

  it("rejects missing email or password with a non-enumerating error", () => {
    expect(parseLoginBody({ password: "x" }).ok).toBe(false);
    expect(parseLoginBody({ email: "a@b.c" }).ok).toBe(false);
    const no = parseLoginBody({});
    expect(no.ok).toBe(false);
    if (!no.ok) expect(no.error).toMatch(/email and password/i);
  });

  it("rejects non-objects and oversized fields", () => {
    expect(parseLoginBody(null).ok).toBe(false);
    expect(parseLoginBody("x").ok).toBe(false);
    expect(
      parseLoginBody({ email: "a@b.c", password: "y".repeat(201) }).ok,
    ).toBe(false);
  });
});

describe("parseUpdateUserBody", () => {
  it("allow-lists + lowercases provider and trims model/api_key", () => {
    const r = parseUpdateUserBody({ provider: "OpenAI", model: " gpt-6-astra ", api_key: " sk-test " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ provider: "openai", model: "gpt-6-astra", apiKey: "sk-test" });
    }
  });

  it("returns exact error strings for provider/model/api_key", () => {
    expect(parseUpdateUserBody({ provider: "evil" })).toEqual({ ok: false, error: "Invalid provider" });
    expect(parseUpdateUserBody({ model: "" })).toEqual({ ok: false, error: "Invalid model" });
    expect(parseUpdateUserBody({ model: "x".repeat(129) })).toEqual({ ok: false, error: "Invalid model" });
    expect(parseUpdateUserBody({ api_key: "x".repeat(2001) })).toEqual({ ok: false, error: "Invalid api_key" });
  });

  it("returns an empty value when no fields are provided", () => {
    const r = parseUpdateUserBody({});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({});
  });
});

describe("parseClaimGuestHistoryBody", () => {
  const valid = {
    guestId: "guest-abc-123",
    targetSessionId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("accepts a well-formed payload", () => {
    expect(parseClaimGuestHistoryBody(valid)).toEqual({ ok: true, value: valid });
  });

  it.each([
    ["empty", {}],
    ["malformed guestId", { ...valid, guestId: "!!!" }],
    ["missing target", { guestId: valid.guestId }],
    ["oversized target", { ...valid, targetSessionId: "x".repeat(201) }],
    ["self-claim", { guestId: valid.guestId, targetSessionId: valid.guestId }],
  ])("returns Invalid payload on %s", (_label, body) => {
    expect(parseClaimGuestHistoryBody(body)).toEqual({ ok: false, error: "Invalid payload" });
  });
});

describe("parseSaveHistoryBody", () => {
  const base = {
    session_id: "s1",
    prompt_original: "orig",
    prompt_optimized: "opt",
  };

  it("extracts fields with defaults (mode=better, provider/optimize null)", () => {
    const r = parseSaveHistoryBody(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({
        session_id: "s1",
        prompt_original: "orig",
        prompt_optimized: "opt",
        mode: "better",
        explanation: "",
        provider: null,
        optimize_session_id: null,
      });
    }
  });

  it("requires session_id, prompt_original and prompt_optimized", () => {
    expect(parseSaveHistoryBody({})).toEqual({ ok: false, error: "Missing required fields" });
    expect(parseSaveHistoryBody({ prompt_original: "a", prompt_optimized: "b" }).ok).toBe(false);
  });

  it("bounds oversized prompts (DoS defense aligned with parseOptimizeBody)", () => {
    const r = parseSaveHistoryBody({ ...base, prompt_original: "x".repeat(100_001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too long/i);
  });

  it("rejects non-objects as Invalid JSON", () => {
    expect(parseSaveHistoryBody(null)).toEqual({ ok: false, error: "Invalid JSON" });
  });
});

describe("parseMode / parseProvider", () => {
  it("accepts known values case-insensitively, falls back otherwise", () => {
    expect(parseMode("Production")).toBe("production");
    expect(parseMode("nope")).toBe("better");
    expect(parseMode(undefined)).toBe("better");
    expect(parseProvider("OpenAI")).toBe("openai");
    expect(parseProvider("x")).toBe("gemini");
  });
});

describe("parseOptimizeBody", () => {
  it("prefers text over prompt and applies defaults", () => {
    const r = parseOptimizeBody({ text: "  hi  ", prompt: "ignored" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.prompt).toBe("hi");
      expect(r.value.mode).toBe("better");
      expect(r.value.provider).toBe("gemini");
      expect(r.value.version).toBe("v1");
    }
  });

  it("rejects missing, empty, oversized and non-object bodies", () => {
    expect(parseOptimizeBody(null).ok).toBe(false);
    expect(parseOptimizeBody({}).ok).toBe(false);
    expect(parseOptimizeBody({ prompt: "   " }).ok).toBe(false);
    expect(parseOptimizeBody({ prompt: "x".repeat(100_001) }).ok).toBe(false);
  });

  it("keeps apiKey/sessionId/version when valid", () => {
    const r = parseOptimizeBody({
      prompt: "hi",
      mode: "cot",
      provider: "openai",
      apiKey: "sk-x",
      session_id: "s1",
      version: "v2",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({
        mode: "cot",
        provider: "openai",
        apiKey: "sk-x",
        sessionId: "s1",
        version: "v2",
      });
    }
  });
});

describe("parseTranslateBody", () => {
  it("parses text, target, provider and apiKey", () => {
    const r = parseTranslateBody({
      text: "  hello  ",
      targetLang: "ES",
      provider: "openai",
      apiKey: "sk-x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({
        text: "hello",
        target: "es",
        provider: "openai",
        apiKey: "sk-x",
      });
    }
  });

  it("accepts legacy target alias and defaults provider", () => {
    const r = parseTranslateBody({ text: "hola", target: "en" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.target).toBe("en");
      expect(r.value.provider).toBe("gemini");
      expect(r.value.apiKey).toBeUndefined();
    }
  });

  it("rejects missing, empty, oversized and mistargeted bodies", () => {
    expect(parseTranslateBody(null).ok).toBe(false);
    expect(parseTranslateBody({}).ok).toBe(false);
    expect(parseTranslateBody({ text: "   ", targetLang: "es" }).ok).toBe(false);
    expect(parseTranslateBody({ text: "x".repeat(50_001), targetLang: "es" }).ok).toBe(false);
    expect(parseTranslateBody({ text: "hi" }).ok).toBe(false);
    expect(parseTranslateBody({ text: "hi", targetLang: "fr" }).ok).toBe(false);
  });
});

describe("parseFeedbackBody", () => {
  it("requires mode, feedback and sessionId", () => {
    expect(parseFeedbackBody(null).ok).toBe(false);
    expect(parseFeedbackBody({ mode: "better" }).ok).toBe(false);
    const r = parseFeedbackBody({
      mode: "better",
      feedback: "up",
      sessionId: "s1",
      inputLength: 12.7,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.inputLength).toBe(12);
      expect(r.value.provider).toBe("gemini");
    }
  });
});
