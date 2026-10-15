import { describe, it, expect } from "vitest";
import { userFacingOptimizeError } from "./optimizeUserError";

describe("userFacingOptimizeError", () => {
  it("handles empty and passthrough", () => {
    expect(userFacingOptimizeError("")).toBe(
      "Optimization failed. Please try again."
    );
    expect(userFacingOptimizeError("weird provider blob")).toBe(
      "weird provider blob"
    );
  });

  it("maps missing-key errors to server setup guidance", () => {
    const msg = userFacingOptimizeError(
      new Error("Missing Gemini API key. Set it up.")
    );
    expect(msg).toMatch(/GOOGLE_GENERATIVE_AI_API_KEY/);
  });

  it("maps quota/rate-limit variants", () => {
    for (const raw of [
      "resource exhausted, retry later",
      "429 too many requests",
      "Rate limit exceeded",
      "quota exceeded for project",
    ]) {
      expect(userFacingOptimizeError(raw)).toMatch(/limiting requests/i);
    }
  });

  it("maps billing exhaustion to the billing page", () => {
    const msg = userFacingOptimizeError(
      "credit_balance_exhausted: You have no credits remaining"
    );
    expect(msg).toMatch(/platform\.openai\.com.*billing/);
  });

  it("maps retired-model 404s to GEMINI_MODEL guidance", () => {
    const msg = userFacingOptimizeError(
      "404 NOT_FOUND: model gemini-2.5-flash is no longer available"
    );
    expect(msg).toMatch(/GEMINI_MODEL/);
  });

  it("maps retry-exhaustion with and without quota", () => {
    expect(
      userFacingOptimizeError("Failed after 2 retries: 429 slow down")
    ).toMatch(/limiting requests/i);
    expect(userFacingOptimizeError("Failed after 2 retries: timeout")).toMatch(
      /did not respond after retries/i
    );
  });

  it("maps invalid-key errors", () => {
    expect(userFacingOptimizeError("403 permission_denied")).toMatch(
      /missing or invalid/i
    );
    expect(userFacingOptimizeError("Invalid API key provided")).toMatch(
      /missing or invalid/i
    );
  });
});
