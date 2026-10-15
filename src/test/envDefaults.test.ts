/**
 * Locks in the test-environment hygiene performed by `vitest.setup.ts`.
 *
 * Vitest loads a developer's `.env.local` into `process.env`. Without the
 * reset in the setup file, `NEXT_PUBLIC_UNLIMITED_MODE=true` (or a local
 * `GEMINI_MODEL` override) silently changes behaviour inside tests, so the
 * suite passes in CI but fails on the machine that wrote it. These assertions
 * make any future leak fail loudly instead of quietly.
 */
import { describe, it, expect } from 'vitest';
import { isUnlimitedMode } from '@/lib/localMode';
import { GUEST_TOKEN_LIMIT, isGuestLimitReached } from '@/lib/guest';
import { createProvider, hasServerKey } from '@/lib/providers';

describe('test environment defaults', () => {
  it('runs with production limits, not unlimited local-dev mode', () => {
    expect(isUnlimitedMode()).toBe(false);
  });

  it('uses the documented guest quota (5) and enforces it', () => {
    expect(GUEST_TOKEN_LIMIT).toBe(5);
    expect(isGuestLimitReached(GUEST_TOKEN_LIMIT - 1)).toBe(false);
    expect(isGuestLimitReached(GUEST_TOKEN_LIMIT)).toBe(true);
  });

  it('pins the documented provider model ids', () => {
    expect(createProvider('gemini', 'byok').modelId).toBe('gemini-3.5-flash');
    expect(createProvider('openai', 'byok').modelId).toBe('gpt-6-astra');
    expect(createProvider('anthropic', 'byok').modelId).toBe(
      'claude-3-5-haiku-latest',
    );
  });

  it('has no ambient provider keys, so tests never reach a real LLM', () => {
    expect(hasServerKey('gemini')).toBe(false);
    expect(hasServerKey('openai')).toBe(false);
    expect(hasServerKey('anthropic')).toBe(false);
  });
});
