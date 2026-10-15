import { describe, it, expect } from "vitest";
import {
  PROMPT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplateById,
  getTemplatesByCategory,
} from "./promptTemplates";

describe("PROMPT_TEMPLATES catalog", () => {
  it("covers every category with unique ids", () => {
    const ids = PROMPT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const covered = new Set(PROMPT_TEMPLATES.map((t) => t.category));
    for (const c of TEMPLATE_CATEGORIES) {
      expect(covered.has(c), `category without template: ${c}`).toBe(true);
    }
  });

  it("every template is complete and production-grade", () => {
    for (const t of PROMPT_TEMPLATES) {
      expect(t.id.trim(), "id").toBeTruthy();
      expect(t.title.trim(), `${t.id} title`).toBeTruthy();
      expect(t.description.trim(), `${t.id} description`).toBeTruthy();
      expect(
        TEMPLATE_CATEGORIES.includes(t.category),
        `${t.id} category`,
      ).toBe(true);
      expect(t.original_prompt.trim(), `${t.id} original`).toBeTruthy();
      // Optimized must substantially expand the starter and carry placeholders.
      expect(
        t.optimized_prompt.length,
        `${t.id} optimized length`,
      ).toBeGreaterThan(t.original_prompt.length * 3);
      expect(t.optimized_prompt, `${t.id} placeholders`).toMatch(/\{\{[A-Z_]+\}\}/);
      expect(t.explanation.trim(), `${t.id} explanation`).toBeTruthy();
      expect(["gemini", "openai", "anthropic"]).toContain(t.provider);
    }
  });

  it("lookups work", () => {
    expect(getTemplateById("saas-onboarding")?.title).toContain("SaaS");
    expect(getTemplateById("nope")).toBeUndefined();
    expect(getTemplatesByCategory("All")).toHaveLength(PROMPT_TEMPLATES.length);
    expect(getTemplatesByCategory("Fintech")).toHaveLength(1);
  });
});
