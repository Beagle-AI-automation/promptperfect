import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  createProvider,
  getModel,
  getProviderCallOptions,
  hasServerKey,
} from './providers';

const ENV_KEYS = [
  'PROMPTPERFECT_GOOGLE_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'PROMPTPERFECT_OPENAI_API_KEY',
  'OPENAI_API_KEY',
  'PROMPTPERFECT_ANTHROPIC_API_KEY',
  'ANTHROPIC_API_KEY',
];

describe('providers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports no server key when the environment is blank', () => {
    for (const k of ENV_KEYS) vi.stubEnv(k, '');
    expect(hasServerKey('gemini')).toBe(false);
    expect(hasServerKey('openai')).toBe(false);
    expect(hasServerKey('anthropic')).toBe(false);
  });

  it('detects server keys with precedence for PROMPTPERFECT_* names', () => {
    for (const k of ENV_KEYS) vi.stubEnv(k, '');
    vi.stubEnv('PROMPTPERFECT_OPENAI_API_KEY', 'sk-app');
    expect(hasServerKey('openai')).toBe(true);
    expect(hasServerKey('gemini')).toBe(false);
  });

  it('creates provider configs from an explicit BYOK key', () => {
    expect(createProvider('gemini', 'g-key').modelId).toBe('gemini-3.5-flash');
    expect(createProvider('openai', 'o-key').modelId).toBe('gpt-6-astra');
    expect(createProvider('anthropic', 'a-key').modelId).toBe(
      'claude-3-5-haiku-latest',
    );
  });

  it('throws a user-facing error when no key is available', () => {
    for (const k of ENV_KEYS) vi.stubEnv(k, '');
    expect(() => createProvider('gemini')).toThrow(/Gemini API key/);
    expect(() => createProvider('openai')).toThrow(/OpenAI API key/);
    expect(() => createProvider('anthropic')).toThrow(/Anthropic API key/);
  });

  it('returns OpenAI reasoning options only for OpenAI', () => {
    const openai = getProviderCallOptions('openai');
    expect(openai.maxOutputTokens).toBe(16000);
    expect(openai.providerOptions).toMatchObject({
      openai: { reasoningEffort: expect.any(String) },
    });
    expect(getProviderCallOptions('gemini')).toEqual({});
  });

  it('getModel resolves the legacy Gemini model', () => {
    expect(getModel('g-key')).toBeDefined();
  });
});
