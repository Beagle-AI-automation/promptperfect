import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { Provider } from "@/lib/types";

const GEMINI_MODEL = "gemini-2.0-flash";
const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

export interface ProviderConfig {
  model: LanguageModelV3;
  modelId: string;
}

export function hasServerKey(provider: Provider): boolean {
  switch (provider) {
    case "gemini":
      return Boolean(
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY
      );
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    default:
      return false;
  }
}

export function createProvider(
  provider: Provider,
  apiKey?: string
): ProviderConfig {
  switch (provider) {
    case "gemini": {
      const key =
        apiKey ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
        process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error(
          "Missing Gemini API key. Set GOOGLE_GENERATIVE_AI_API_KEY or pass apiKey."
        );
      }
      return {
        model: createGoogleGenerativeAI({ apiKey: key }).languageModel(
          GEMINI_MODEL
        ),
        modelId: GEMINI_MODEL,
      };
    }
    case "openai": {
      const key = apiKey ?? process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error(
          "Missing OpenAI API key. Set OPENAI_API_KEY or pass apiKey."
        );
      }
      return {
        model: createOpenAI({ apiKey: key }).languageModel(OPENAI_MODEL),
        modelId: OPENAI_MODEL,
      };
    }
    case "anthropic": {
      const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error(
          "Missing Anthropic API key. Set ANTHROPIC_API_KEY or pass apiKey."
        );
      }
      return {
        model: createAnthropic({ apiKey: key }).languageModel(ANTHROPIC_MODEL),
        modelId: ANTHROPIC_MODEL,
      };
    }
  }
}

/** Legacy `/api/optimize` — Gemini only. */
export function getModel(apiKey?: string | null): LanguageModelV3 {
  return createProvider("gemini", apiKey ?? undefined).model;
}
