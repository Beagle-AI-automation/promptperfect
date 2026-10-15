import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetRateLimits } from "@/lib/auth/rateLimit";

afterEach(() => {
  cleanup();
  // The rate limiter keeps module-level state. Because the suite runs with
  // `fileParallelism: false`, every test file shares one process — and one
  // limiter — so without this reset a request budget consumed by one test
  // file can bleed into the next and surface as a phantom 429.
  resetRateLimits();
});

/**
 * Test-env hygiene (hermeticity).
 *
 * Vitest loads `.env.local` into `process.env` in addition to `.env`. Without
 * this reset, a developer's local `.env.local` silently changes production
 * behaviour inside tests — e.g. `NEXT_PUBLIC_UNLIMITED_MODE=true` disables the
 * guest quota, the limit modal and server rate limiting, and `GEMINI_MODEL`
 * overrides the provider model id. That made the suite pass in CI (no
 * `.env.local`) but fail locally: results depended on the developer's machine.
 *
 * Setup files run before each test module is imported, so this also pins the
 * values that modules resolve at import time (`GUEST_TOKEN_LIMIT`,
 * `GEMINI_MODEL`, `OPENAI_MODEL`, …). Tests that deliberately exercise a flag
 * (`vi.stubEnv` / `process.env`) still win, because they run afterwards.
 *
 * Rules:
 * - Never assert against a value that only exists in `.env.local`.
 * - Every key below must be absent so tests observe the documented production
 *   defaults; individual tests stub whatever they need.
 */
const PRODUCTION_DEFAULT_ENV_KEYS = [
  // Feature flags / quotas (ADR-0003 unlimited local mode).
  "NEXT_PUBLIC_UNLIMITED_MODE",
  "UNLIMITED_MODE",
  "NEXT_PUBLIC_GUEST_TOKEN_LIMIT",
  // Model + endpoint overrides: pin the documented defaults.
  "GEMINI_MODEL",
  "OPENAI_MODEL",
  "OPENAI_REASONING_EFFORT",
  "PROMPTPERFECT_OPENAI_BASE_URL",
  "PROMPTPERFECT_ANTHROPIC_BASE_URL",
  "PROMPTPERFECT_GOOGLE_BASE_URL",
  // Provider keys: unit tests must never reach a real LLM provider (zero cost,
  // zero flakiness). Tests that need a key stub one explicitly.
  "PROMPTPERFECT_GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "PROMPTPERFECT_OPENAI_API_KEY",
  "OPENAI_API_KEY",
  "PROMPTPERFECT_ANTHROPIC_API_KEY",
  "ANTHROPIC_API_KEY",
] as const;

for (const key of PRODUCTION_DEFAULT_ENV_KEYS) {
  delete process.env[key];
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
