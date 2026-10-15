import { describe, it, expect } from "vitest";
import { FEEDBACK_MODES, modeFromHistoryRow } from "./modes";

describe("modeFromHistoryRow", () => {
  it("passes through known modes case-insensitively", () => {
    expect(modeFromHistoryRow("production")).toBe("production");
    expect(modeFromHistoryRow(" CoT ")).toBe("cot");
  });

  it("falls back to better for unknown modes", () => {
    expect(modeFromHistoryRow("nope")).toBe("better");
    expect(modeFromHistoryRow("")).toBe("better");
  });

  it("covers every user-facing mode", () => {
    for (const m of [
      "better", "specific", "cot", "developer", "research",
      "beginner", "product", "marketing", "production",
    ] as const) {
      expect(FEEDBACK_MODES).toContain(m);
    }
  });
});
