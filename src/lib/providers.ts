import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { Provider } from "@/lib/types";

/**
 * Default to current GA Flash. Override with `GEMINI_MODEL` if needed.
 * `gemini-2.5-flash` was retired by Google (404 for new keys) — prefer 3.5.
 */
const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-6-astra";
const ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

/**
 * Explicit API base URLs. Pinned to the providers' own endpoints so an ambient
 * shell variable (e.g. a global `OPENAI_BASE_URL` pointing at a gateway like
 * OpenRouter) can never silently hijack requests. Override per-app with
 * `PROMPTPERFECT_OPENAI_BASE_URL` / `PROMPTPERFECT_ANTHROPIC_BASE_URL`.
 */
const OPENAI_BASE_URL =
  process.env.PROMPTPERFECT_OPENAI_BASE_URL?.trim() ||
  "https://api.openai.com/v1";
const ANTHROPIC_BASE_URL =
  process.env.PROMPTPERFECT_ANTHROPIC_BASE_URL?.trim() ||
  "https://api.anthropic.com/v1";

/**
 * Reasoning effort for OpenAI reasoning models (GPT-6 Astra supports
 * low/medium/high/xhigh/max). Override with `OPENAI_REASONING_EFFORT`.
 */
const OPENAI_REASONING_EFFORT =
  process.env.OPENAI_REASONING_EFFORT?.trim() || "high";

export interface ProviderConfig {
  model: LanguageModelV3;
  modelId: string;
}

/**
 * Extra `generateText`/`streamText` options for a provider. OpenAI reasoning
 * models need an explicit effort level plus output headroom (reasoning tokens
 * count toward the limit); other providers use SDK defaults.
 */
export function getProviderCallOptions(provider: Provider): {
  providerOptions?: ProviderOptions;
  maxOutputTokens?: number;
} {
  if (provider === "openai") {
    return {
      providerOptions: { openai: { reasoningEffort: OPENAI_REASONING_EFFORT } },
      maxOutputTokens: 16000,
    };
  }
  return {};
}

export function hasServerKey(provider: Provider): boolean {
  switch (provider) {
    case "gemini":
      return Boolean(
        process.env.PROMPTPERFECT_GOOGLE_API_KEY ??
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
          process.env.GEMINI_API_KEY ??
          process.env.GOOGLE_API_KEY
      );
    case "openai":
      return Boolean(
        process.env.PROMPTPERFECT_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY
      );
    case "anthropic":
      return Boolean(
        process.env.PROMPTPERFECT_ANTHROPIC_API_KEY ??
          process.env.ANTHROPIC_API_KEY
      );
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
        process.env.PROMPTPERFECT_GOOGLE_API_KEY ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
        process.env.GEMINI_API_KEY ??
        process.env.GOOGLE_API_KEY;
      if (!key) {
        throw new Error(
          "Missing Gemini API key. Set GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY, or pass apiKey."
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
      const key =
        apiKey ??
        process.env.PROMPTPERFECT_OPENAI_API_KEY ??
        process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error(
          "Missing OpenAI API key. Set OPENAI_API_KEY or pass apiKey."
        );
      }
      return {
        model: createOpenAI({ apiKey: key, baseURL: OPENAI_BASE_URL }).languageModel(
          OPENAI_MODEL,
        ),
        modelId: OPENAI_MODEL,
      };
    }
    case "anthropic": {
      const key =
        apiKey ??
        process.env.PROMPTPERFECT_ANTHROPIC_API_KEY ??
        process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error(
          "Missing Anthropic API key. Set ANTHROPIC_API_KEY or pass apiKey."
        );
      }
      return {
        model: createAnthropic({ apiKey: key, baseURL: ANTHROPIC_BASE_URL }).languageModel(
          ANTHROPIC_MODEL,
        ),
        modelId: ANTHROPIC_MODEL,
      };
    }
  }
}

/** Legacy `/api/optimize` — Gemini only. */
export function getModel(apiKey?: string | null): LanguageModelV3 {
  return createProvider("gemini", apiKey ?? undefined).model;
}
