import { describe, it, expect } from "vitest";
import {
  analyzeResult,
  estimateCostUsd,
  estimateTokens,
  findPlaceholders,
  gradeForScore,
  qualityChecks,
} from "./resultInsights";

const GOOD = [
  "You are a senior backend architect. Design the REST API for the orders resource.",
  "",
  "## Endpoints",
  "1. List orders with cursor pagination (default 25, max 100).",
  "2. Create orders idempotently via Idempotency-Key.",
  "",
  "## Constraints",
  "- You must return the error envelope {code, message, requestId}.",
  "- Never expose stack traces; limit payloads to 1MB.",
  "",
  "## Output format",
  "Respond with an OpenAPI YAML sketch plus a markdown table of status codes.",
  "",
  "Success means: all list endpoints paginate and every mutation is idempotent.",
  "Additional context to reach a healthy length: versioning is URL-based (/v1), auth is OAuth2 client credentials, " +
    "rate limit 100 rpm per key, webhooks fire on created/updated, retries use exponential backoff, " +
    "and the acceptance criteria include contract tests plus a staging smoke run.",
].join("\n");

describe("estimateTokens", () => {
  it("is 0 for empty and len/4 rounded up otherwise", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("   ")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });
});

describe("findPlaceholders", () => {
  it("extracts deduplicated names in order", () => {
    expect(findPlaceholders("Hi {{NAME}}, meet {{ NAME }} and {{ROLE}}!")).toEqual([
      "NAME",
      "ROLE",
    ]);
    expect(findPlaceholders("no markers")).toEqual([]);
    expect(findPlaceholders("{{}} {{ }}")).toEqual([]);
  });
});

describe("gradeForScore", () => {
  it("maps bands", () => {
    expect(gradeForScore(95)).toBe("A");
    expect(gradeForScore(80)).toBe("A");
    expect(gradeForScore(79)).toBe("B");
    expect(gradeForScore(40)).toBe("C");
    expect(gradeForScore(39)).toBe("D");
  });
});

describe("qualityChecks", () => {
  it("passes a well-formed production prompt", () => {
    const failed = qualityChecks(GOOD).filter((c) => !c.passed);
    expect(failed).toEqual([]);
  });

  it("grades structure by mode", () => {
    const paras = [
      "First developed paragraph with enough words to count as substantive content here.",
      "Second developed paragraph with enough words to count as substantive content here.",
      "Third developed paragraph with enough words to count as substantive content here.",
      "Fourth developed paragraph with enough words to count as substantive content here.",
      "Fifth developed paragraph with enough words to count as substantive content here.",
    ].join("\n\n");
    // Better mode: paragraphs pass, bullets not required.
    expect(
      qualityChecks(paras, "better").find((c) => c.id === "structure")?.passed
    ).toBe(true);
    // ...but the same text fails the generic bar (no markers).
    expect(
      qualityChecks(paras).find((c) => c.id === "structure")?.passed
    ).toBe(false);
    // CoT mode demands numbered steps.
    expect(
      qualityChecks(paras, "cot").find((c) => c.id === "structure")?.passed
    ).toBe(false);
    expect(
      qualityChecks(`1. First step\n2. Second step\n${paras}`, "cot").find(
        (c) => c.id === "structure"
      )?.passed
    ).toBe(true);
  });

  it("flags thin prompts, banned openers and leaked markers", () => {
    const checks = Object.fromEntries(
      qualityChecks("(A) Do stuff\n---EXPLANATION---").map((c) => [c.id, c.passed]),
    );
    expect(checks.length).toBe(false);
    expect(checks.opener).toBe(false);
    expect(checks.contract).toBe(false);
    expect(checks.constraints).toBe(false);
  });

  it("recognizes line-break and syllable shape specs as format", () => {
    const withShape =
      `${GOOD}\n\nThe response must use standard line breaks with strict 5-7-5 syllable structure. ` +
      'Padding with more than thirty words total in this prompt body for the length gate to clear properly here.';
    expect(
      qualityChecks(withShape, 'better').find((c) => c.id === 'format')?.passed
    ).toBe(true);
  });

  it("detects success criteria phrasings without false positives", () => {    const passed = (text: string) =>
      qualityChecks(
        `${GOOD}\n${text}\nPadding to reach healthy length with more than thirty words total in this prompt body for the length gate to clear properly here.`,
      ).find((c) => c.id === "success")?.passed;
    expect(passed("Done when all endpoints return in under 200ms.")).toBe(true);
    expect(passed("Must meet all targets before release.")).toBe(true);
    expect(passed("Run the acceptance tests in staging.")).toBe(true);
    // "target audience" is marketing context, not a success criterion.
    expect(
      qualityChecks(
        "Write landing copy for our target audience of developers. " +
          "Padding to reach healthy length with more than thirty words total in this prompt body for the length gate.",
      ).find((c) => c.id === "success")?.passed,
    ).toBe(false);
  });
});

describe("estimateCostUsd", () => {
  it("prices known models and returns null otherwise", () => {
    expect(estimateCostUsd("gpt-6-astra", 1_000_000, 0)).toBe(10);
    expect(estimateCostUsd("GPT-6-ASTRA", 0, 1_000_000)).toBe(50);
    expect(estimateCostUsd("gemini-3.5-flash", 1000, 1000)).toBeNull();
  });
});

describe("analyzeResult", () => {
  it("bundles score, checks, placeholders and meta", () => {
    const r = analyzeResult("short input", `${GOOD}\n\nFill {{API_KEY}} first.`, "openai", "gpt-6-astra");
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.grade).toMatch(/^[AB]$/);
    expect(r.passedCount).toBe(r.checks.length);
    expect(r.placeholders).toEqual(["API_KEY"]);
    expect(r.inputTokens).toBeGreaterThan(0);
    expect(r.outputTokens).toBeGreaterThan(r.inputTokens);
    expect(r.costUsd).not.toBeNull();
    expect(r.costEstimated).toBe(true);
  });

  it("leaves cost null for unpriced models", () => {
    const r = analyzeResult("in", GOOD, "gemini", "gemini-3.5-flash");
    expect(r.costUsd).toBeNull();
    expect(r.placeholders).toEqual([]);
  });
});
