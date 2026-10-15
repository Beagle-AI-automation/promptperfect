import { describe, it, expect } from "vitest";
import { getSystemPrompt, SYSTEM_PROMPTS } from "./prompts";

describe("getSystemPrompt", () => {
  it("returns the prompt for known modes case-insensitively", () => {
    expect(getSystemPrompt("better")).toBe(SYSTEM_PROMPTS.better);
    expect(getSystemPrompt("COT")).toBe(SYSTEM_PROMPTS.cot);
    expect(getSystemPrompt("Production")).toBe(SYSTEM_PROMPTS.production);
  });

  it("falls back to better for unknown modes", () => {
    expect(getSystemPrompt("nope")).toBe(SYSTEM_PROMPTS.better);
  });

  it("falls back to better for non-string input", () => {
    expect(getSystemPrompt(undefined as unknown as string)).toBe(
      SYSTEM_PROMPTS.better,
    );
    expect(getSystemPrompt(null as unknown as string)).toBe(
      SYSTEM_PROMPTS.better,
    );
  });

  it("resolves every supported mode to a non-empty prompt", () => {
    for (const mode of [
      "better",
      "specific",
      "cot",
      "developer",
      "research",
      "beginner",
      "product",
      "marketing",
      "production",
    ]) {
      const prompt = getSystemPrompt(mode);
      expect(prompt.length).toBeGreaterThan(0);
    }
  });
});
