import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const {
  mockSignInWithPassword,
  mockCheckRateLimit,
  mockCreateClient,
  mockGetSupabaseAdminClient,
  mockJsonLoginSuccess,
} = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
  mockCreateClient: vi.fn(),
  mockGetSupabaseAdminClient: vi.fn(),
  mockJsonLoginSuccess: vi.fn(),
}));

vi.mock('@/lib/auth/rateLimit', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/auth/rateLimit')>();
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock('@/lib/server/supabase', () => ({
  getSupabaseAdminClient: () => mockGetSupabaseAdminClient(),
}));

vi.mock('@/lib/auth/jsonLoginSuccess', () => ({
  jsonLoginSuccess: (...args: unknown[]) => mockJsonLoginSuccess(...args),
}));

function makeRequest(body: Record<string, unknown>, ip = '127.0.0.1') {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('/api/auth/login POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockCreateClient.mockReturnValue({
      auth: { signInWithPassword: mockSignInWithPassword },
    });
    mockGetSupabaseAdminClient.mockReturnValue({ from: vi.fn() });
    mockJsonLoginSuccess.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'u1' }, session: {} }), {
        status: 200,
      }),
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'test123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email and password/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email and password/i);
  });

  it('returns 401 on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });
    const res = await POST(
      makeRequest({ email: 'test@example.com', password: 'wrong' }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid email or password/i);
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue(false);
    const res = await POST(
      makeRequest({ email: 'test@example.com', password: 'test' }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many attempts/i);
  });

  it('returns 200 with user data on successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'at', refresh_token: 'rt' },
      },
      error: null,
    });
    const res = await POST(
      makeRequest({ email: 'test@example.com', password: 'correct' }),
    );
    expect(res.status).toBe(200);
    expect(mockJsonLoginSuccess).toHaveBeenCalled();
  });
});
