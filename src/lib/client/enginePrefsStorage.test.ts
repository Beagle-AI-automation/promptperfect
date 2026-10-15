'use client';

import { describe, it, expect, beforeEach } from "vitest";
import {
  API_KEY_STORAGE_KEY,
  loadApiKey,
  readEnginePrefs,
  writeEnginePrefs,
} from "./enginePrefsStorage";

describe("enginePrefsStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips engine prefs", () => {
    expect(readEnginePrefs()).toBeNull();
    writeEnginePrefs({ provider: "openai", model: "gpt-6-astra" });
    expect(readEnginePrefs()).toEqual({ provider: "openai", model: "gpt-6-astra" });
  });

  it("loadApiKey returns empty for gemini and missing keys", () => {
    expect(loadApiKey("gemini")).toBe("");
    expect(loadApiKey("openai")).toBe("");
    localStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify({ openai: "sk-test" }));
    expect(loadApiKey("openai")).toBe("sk-test");
    expect(loadApiKey("anthropic")).toBe("");
  });

  it("loadApiKey survives corrupt storage", () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, "{broken");
    expect(loadApiKey("openai")).toBe("");
  });
});
