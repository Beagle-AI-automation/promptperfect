import { describe, it, expect } from "vitest";
import { buildRemediationBlock } from "./remediation";

describe("buildRemediationBlock", () => {
  it("returns empty when nothing failed", () => {
    expect(buildRemediationBlock([])).toBe("");
  });

  it("maps known check ids to directives and ignores unknown ones", () => {
    const block = buildRemediationBlock([
      "constraints",
      "nope",
      "success",
    ]);
    expect(block).toContain("Refinement pass");
    expect(block).toContain("- Constraints:");
    expect(block).toContain("- Success criteria:");
    expect(block).not.toContain("nope");
  });

  it("covers every quality check id", () => {
    const block = buildRemediationBlock([
      "length",
      "opener",
      "structure",
      "constraints",
      "format",
      "success",
      "contract",
    ]);
    for (const id of [
      "length",
      "opener",
      "structure",
      "constraints",
      "format",
      "success",
      "contract",
    ]) {
      expect(block.length).toBeGreaterThan(0);
      expect(id).toBeTruthy();
    }
    expect(block.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(7);
  });
});
