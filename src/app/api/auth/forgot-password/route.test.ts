import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const {
  mockCheckRateLimit,
  mockGetSupabaseUrl,
  mockNormalizeEnvValue,
  mockGetAdminClient,
  mockGenerateLink,
  mockResetEmail,
  mockCreateClient,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockGetSupabaseUrl: vi.fn(),
  mockNormalizeEnvValue: vi.fn(),
  mockGetAdminClient: vi.fn(),
  mockGenerateLink: vi.fn(),
  mockResetEmail: vi.fn(),
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/auth/rateLimit', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/auth/rateLimit')>();
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  };
});

vi.mock('@/lib/server/supabase', () => ({
  getSupabaseUrl: (...args: unknown[]) => mockGetSupabaseUrl(...args),
  normalizeEnvValue: (...args: unknown[]) => mockNormalizeEnvValue(...args),
  getSupabaseAdminClient: (...args: unknown[]) =>
    mockGetAdminClient(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.7',
    },
    body: JSON.stringify(body),
  });
}

function linkData(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    user: { id: 'user-1', identities: [] },
    properties: {},
    ...overrides,
  };
}

describe('/api/auth/forgot-password POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetSupabaseUrl.mockReturnValue('https://test.supabase.co');
    mockNormalizeEnvValue.mockReturnValue('anon-key');
    mockGetAdminClient.mockReturnValue({
      auth: { admin: { generateLink: mockGenerateLink } },
    });
    mockCreateClient.mockReturnValue({
      auth: { resetPasswordForEmail: mockResetEmail },
    });
    mockGenerateLink.mockResolvedValue({
      data: linkData(),
      error: null,
    });
    mockResetEmail.mockResolvedValue({ error: null });
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValueOnce(false);
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(429);
  });

  it('returns 400 for an invalid email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 503 when Supabase is not configured', async () => {
    mockGetSupabaseUrl.mockReturnValueOnce(null);
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(503);
  });

  it('returns 503 with a setup hint when the service key is missing', async () => {
    mockGetAdminClient.mockReturnValueOnce(null);
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('SERVICE_KEY_REQUIRED');
  });

  it('responds success for unknown emails (anti-enumeration)', async () => {
    mockGenerateLink.mockResolvedValueOnce({
      data: null,
      error: { message: 'User not found', status: 404 },
    });
    const res = await POST(makeRequest({ email: 'ghost@example.com' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, emailSent: true });
  });

  it('responds success when generateLink returns no user', async () => {
    mockGenerateLink.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const res = await POST(makeRequest({ email: 'ghost@example.com' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, emailSent: true });
  });

  it('sends the reset email on success', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, emailSent: true });
    expect(body.recoveryLink).toBeUndefined();
  });

  it('adds a Google hint and local recovery link when applicable', async () => {
    mockGenerateLink.mockResolvedValueOnce({
      data: linkData({
        user: { id: 'user-1', identities: [{ provider: 'google' }] },
        properties: { action_link: 'http://localhost/auth/recovery' },
      }),
      error: null,
    });
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, emailSent: true });
    expect(typeof body.googleOnlyHint).toBe('string');
    expect(body.recoveryLink).toBe('http://localhost/auth/recovery');
  });

  it('maps a real generateLink failure to 400', async () => {
    mockGenerateLink.mockResolvedValueOnce({
      data: null,
      error: { message: 'SMTP not configured' },
    });
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('EMAIL_NOT_CONFIGURED');
  });

  it('returns the direct link on localhost when email send fails', async () => {
    mockGenerateLink.mockResolvedValueOnce({
      data: linkData({
        properties: { action_link: 'http://localhost/auth/recovery' },
      }),
      error: null,
    });
    mockResetEmail.mockResolvedValueOnce({
      error: { message: 'over_email_send_rate_limit' },
    });
    const res = await POST(makeRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      emailSent: false,
      recoveryLink: 'http://localhost/auth/recovery',
      code: 'EMAIL_RATE_LIMIT',
    });
  });
});
