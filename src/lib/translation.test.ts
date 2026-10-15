import { describe, it, expect } from "vitest";
import {
  buildTranslatorPrompt,
  detectLanguage,
  translateButtonLabel,
  translationTargetFor,
} from "./translation";

describe("detectLanguage", () => {
  it("spots Spanish by accents and stopwords", () => {
    expect(detectLanguage("¿Cómo estás? Hola, gracias por su ayuda")).toBe("es");
    expect(detectLanguage("Diseña una API para los pedidos")).toBe("es");
  });

  it("spots English and defaults ties/empty to English", () => {
    expect(detectLanguage("Design an API for orders, please")).toBe("en");
    expect(detectLanguage("")).toBe("en");
    expect(detectLanguage("API JSON")).toBe("en");
  });
});

describe("translationTargetFor / labels", () => {
  it("targets the other language", () => {
    expect(translationTargetFor("Hola mundo")).toBe("en");
    expect(translationTargetFor("Hello world")).toBe("es");
    expect(translateButtonLabel("Hola")).toBe("Traducir al English");
    expect(translateButtonLabel("Hello")).toBe("Traducir al español");
  });
});

describe("buildTranslatorPrompt", () => {
  it("protects placeholders, code and section markers", () => {
    const p = buildTranslatorPrompt("es");
    expect(p).toContain("Spanish");
    expect(p).toContain("{{PLACEHOLDERS}}");
    expect(p).toContain("---EXPLANATION---");
    expect(buildTranslatorPrompt("en")).toContain("English");
  });
});
