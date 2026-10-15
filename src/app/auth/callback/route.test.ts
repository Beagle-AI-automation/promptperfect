import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

const { mockExchange, mockCookieSet } = vi.hoisted(() => ({
  mockExchange: vi.fn(),
  mockCookieSet: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: (...args: unknown[]) => mockExchange(...args) },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: (...args: unknown[]) => mockCookieSet(...args),
  })),
}));

function get(url: string) {
  return new Request(url, { method: 'GET' });
}

describe('/auth/callback GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    mockExchange.mockResolvedValue({ error: null });
  });

  it('redirects provider errors to login with a friendly message', async () => {
    const res = await GET(
      get('http://localhost/auth/callback?error=access_denied&error_code=otp_expired'),
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get('location') ?? '';
    expect(loc.startsWith('http://localhost/login?error=')).toBe(true);
  });

  it('redirects to login when the code is missing', async () => {
    const res = await GET(get('http://localhost/auth/callback'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?error=');
  });

  it('exchanges the code and redirects to the safe next path', async () => {
    const res = await GET(get('http://localhost/auth/callback?code=abc&next=/library'));
    expect(mockExchange).toHaveBeenCalledWith('abc');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost/library?auth=callback',
    );
  });

  it('blocks open redirects through next', async () => {
    for (const next of ['//evil.com/x', 'https://evil.com', '']) {
      const res = await GET(
        get(`http://localhost/auth/callback?code=abc&next=${encodeURIComponent(next)}`),
      );
      expect(res.headers.get('location')).toBe('http://localhost/app?auth=callback');
    }
  });

  it('redirects exchange failures to login', async () => {
    mockExchange.mockResolvedValue({
      error: { message: 'bad code', code: 'bad_code' },
    });
    const res = await GET(get('http://localhost/auth/callback?code=bad'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?error=');
  });
});
