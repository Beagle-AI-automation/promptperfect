import { describe, expect, it, vi } from 'vitest';
import { signInWithGoogle } from './signInWithGoogle';

function mockClient(oauthResult: unknown) {
  return {
    auth: { signInWithOAuth: vi.fn().mockResolvedValue(oauthResult) },
  } as never;
}

describe('signInWithGoogle', () => {
  it('navigates to the provider URL on success', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000', assign },
      writable: true,
      configurable: true,
    });
    const client = mockClient({ data: { url: 'https://accounts.google/x' }, error: null });
    const res = await signInWithGoogle(client);
    expect(res.error).toBeNull();
    expect(assign).toHaveBeenCalledWith('https://accounts.google/x');
    vi.unstubAllGlobals();
  });

  it('returns provider errors without navigating', async () => {
    const client = mockClient({ data: null, error: { message: 'denied' } });
    const res = await signInWithGoogle(client);
    expect(res.error).toMatchObject({ message: 'denied' });
  });

  it('returns a setup error when no redirect URL comes back', async () => {
    const client = mockClient({ data: {}, error: null });
    const res = await signInWithGoogle(client);
    expect(res.error).toBeInstanceOf(Error);
    expect(String(res.error)).toMatch(/redirect URL/);
  });
});
