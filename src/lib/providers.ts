import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { Provider } from './types';

import type { LanguageModelV2, LanguageModelV3 } from '@ai-sdk/provider';

export interface ProviderConfig {
  model: LanguageModelV2 | LanguageModelV3;
  modelId: string;
}

export function createProvider(providerId: Provider, apiKey?: string): ProviderConfig {
  switch (providerId) {
    case 'gemini': {
      const key = process.env.GOOGLE_API_KEY;
      if (!key) throw new Error('GOOGLE_API_KEY is not set');
      const google = createGoogleGenerativeAI({ apiKey: key });
      return { model: google('gemini-2.0-flash'), modelId: 'gemini-2.0-flash' };
    }
    case 'openai': {
      if (!apiKey?.trim()) throw new Error('OpenAI requires an API key');
      const openai = createOpenAI({ apiKey: apiKey.trim() });
      return { model: openai('gpt-4o-mini'), modelId: 'gpt-4o-mini' };
    }
    case 'anthropic': {
      if (!apiKey?.trim()) throw new Error('Anthropic requires an API key');
      const anthropic = createAnthropic({ apiKey: apiKey.trim() });
      return { model: anthropic('claude-3-5-haiku-latest'), modelId: 'claude-3-5-haiku-latest' };
    }
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}
