import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const { mockCheckRateLimit, mockCreateClient } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
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

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

function buildServiceClient(opts: {
  existingEmail?: boolean;
  adminCreateUser?: { data: unknown; error: unknown };
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: opts.existingEmail ? { id: 'existing-id' } : null,
    error: null,
  });

  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ select, insert }));

  const adminCreateUser = vi.fn().mockResolvedValue(
    opts.adminCreateUser ?? {
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    },
  );
  const updateUserById = vi.fn().mockResolvedValue({ error: null });
  const resend = vi.fn().mockResolvedValue({ error: null });
  const signUp = vi.fn();

  return {
    from,
    auth: {
      admin: { createUser: adminCreateUser, updateUserById },
      signInWithPassword: vi.fn(),
      signUp,
      resend,
    },
  };
}

describe('/api/auth/signup POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    mockCreateClient.mockImplementation(() =>
      buildServiceClient({ existingEmail: false }),
    );
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(
      makeRequest({ password: 'StrongPass123!' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid email/i);
  });

  it('returns 400 on weak password', async () => {
    const res = await POST(
      makeRequest({ email: 'new@example.com', password: '123' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/password/i);
  });

  it('returns 409 on duplicate email in pp_users', async () => {
    mockCreateClient.mockImplementation(() =>
      buildServiceClient({ existingEmail: true }),
    );
    const res = await POST(
      makeRequest({
        email: 'existing@example.com',
        password: 'StrongPass123!',
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already exists/i);
  });

  it('returns 200 with verificationRequired on valid signup', async () => {
    const res = await POST(
      makeRequest({
        email: 'new@example.com',
        password: 'StrongPass123!',
        name: 'New User',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verificationRequired).toBe(true);
    expect(body.email).toBe('new@example.com');
  });
});
