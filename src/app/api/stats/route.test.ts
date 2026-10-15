import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as auth from '@/lib/server/supabaseRequestIdentity';
import { GET } from './route';

const { mockGetAdminClient } = vi.hoisted(() => ({
  mockGetAdminClient: vi.fn(),
}));

vi.mock('@/lib/server/supabase', () => ({
  getSupabaseAdminClient: (...args: unknown[]) => mockGetAdminClient(...args),
}));

vi.mock('@/lib/server/optimizationLogStats', () => ({
  computeOptimizationFeedbackAnalytics: vi.fn().mockResolvedValue({
    thumbsUp: 2,
    thumbsDown: 1,
    avgScore: 80,
  }),
}));

const IDENTITY = { userId: 'user-1', email: 'u@example.com', token: 'tok' };

describe('/api/stats GET', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(IDENTITY);
  });

  it('returns zeroed unauthenticated stats without a session', async () => {
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(undefined);
    mockGetAdminClient.mockReturnValue({ from: vi.fn() });
    const res = await GET(new Request('http://localhost/api/stats'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      total: 0,
      thumbsUp: 0,
      authenticated: false,
    });
  });

  it('aggregates history rows by mode and provider', async () => {
    const rows = [
      { mode: 'better', provider: 'gemini', optimize_session_id: 'a' },
      { mode: 'better', provider: 'openai', optimize_session_id: 'b' },
      { mode: 'cot', provider: 'gemini', optimize_session_id: 'c' },
    ];
    const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    mockGetAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) });

    const res = await GET(new Request('http://localhost/api/stats'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      total: 3,
      thumbsUp: 2,
      thumbsDown: 1,
      avgScore: 80,
      byMode: { better: 2, cot: 1 },
      byProvider: { gemini: 2, openai: 1 },
      authenticated: true,
    });
  });

  it('falls back to the narrow select when optimize_session_id is missing', async () => {
    const schemaErr = { message: "Could not find the 'optimize_session_id' column" };
    const eq1 = vi.fn().mockResolvedValue({ data: null, error: schemaErr });
    const rows = [{ mode: 'specific', provider: 'anthropic' }];
    const eq2 = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi
      .fn()
      .mockReturnValueOnce({ eq: eq1 })
      .mockReturnValueOnce({ eq: eq2 });
    mockGetAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) });

    const res = await GET(new Request('http://localhost/api/stats'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      total: 1,
      byMode: { specific: 1 },
      authenticated: true,
    });
  });

  it('never leaks internal DB errors to the client (generic 500)', async () => {
    const dbErr = { message: 'relation "pp_optimization_history" does not exist' };
    const eq = vi.fn().mockResolvedValue({ data: null, error: dbErr });
    const select = vi.fn().mockReturnValue({ eq });
    mockGetAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) });

    const res = await GET(new Request('http://localhost/api/stats'));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe('Could not load stats');
    expect(JSON.stringify(json)).not.toMatch(/relation|does not exist/i);
  });

  it('throttles an IP before spending JWT verification', async () => {
    const spy = vi
      .spyOn(auth, 'resolveIdentity')
      .mockResolvedValue(undefined);
    const req = () =>
      new Request('http://localhost/api/stats', {
        method: 'GET',
        headers: { 'x-forwarded-for': '198.51.100.47' },
      });

    // Unauthenticated here, and this route answers 200 with zeroed stats
    // rather than 401 — the status is not the point, the call count is.
    let last: Response | undefined;
    for (let i = 0; i < 60; i++) {
      last = await GET(req());
      expect(last.status).not.toBe(429);
    }
    expect(spy.mock.calls.length).toBe(60);

    const blocked = await GET(req());
    expect(blocked.status).toBe(429);
    // Cut by the limiter: identity was never resolved for the 61st call.
    expect(spy.mock.calls.length).toBe(60);
  });
});
