import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

const { mockFetch, mockCheckRateLimit, mockGetUser } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
  mockGetUser: vi.fn(),
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
  createRouteHandlerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/verify-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/verify-key POST', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'u@example.com' } },
      error: null,
    });
    mockCheckRateLimit.mockReturnValue(true);
  });

  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });
    const res = await POST(makeRequest({ provider: 'openai', apiKey: 'sk-test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when provider is missing', async () => {
    const res = await POST(makeRequest({ apiKey: 'sk-test-123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toMatch(/bad request/i);
  });

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({ provider: 'openai' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('returns 400 for unsupported provider', async () => {
    const res = await POST(
      makeRequest({ provider: 'unknown-llm', apiKey: 'key-123' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toMatch(/bad request/i);
  });

  it('returns ok:false with Invalid key on 401 from provider', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'bad-key' }),
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toMatch(/invalid key/i);
  });

  it('returns ok:true when provider responds 200', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'sk-valid-key' }),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns ok:false with Provider unreachable on network error', async () => {
    mockFetch.mockRejectedValue(new Error('network timeout'));
    const res = await POST(
      makeRequest({ provider: 'gemini', apiKey: 'key-123' }),
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toMatch(/unreachable/i);
  });
});
