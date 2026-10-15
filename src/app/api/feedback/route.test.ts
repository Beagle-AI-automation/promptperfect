import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const { mockFrom, mockGetServiceClient, mockResolveIdentity } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetServiceClient: vi.fn(),
  mockResolveIdentity: vi.fn(),
}));

vi.mock('@/lib/server/supabase', () => ({
  getServiceClient: (...args: unknown[]) => mockGetServiceClient(...args),
}));

vi.mock('@/lib/server/supabaseRequestIdentity', () => ({
  resolveIdentity: (...args: unknown[]) => mockResolveIdentity(...args),
}));

vi.mock('@/lib/auth/rateLimit', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/auth/rateLimit')>();
  return { ...actual, checkRateLimit: () => true };
});

function post(body: unknown, ip = '10.0.0.1') {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/** Minimal supabase chain: update().eq().select() -> { data, error }. */
function chainUpdate(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ update });
  return { update, eq, select };
}

describe('/api/feedback POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveIdentity.mockResolvedValue(null);
    mockGetServiceClient.mockReturnValue({ from: mockFrom });
  });

  it('returns 500 when Supabase is not configured', async () => {
    mockGetServiceClient.mockReturnValue(null);
    const res = await POST(
      post({ mode: 'better', feedback: 'up', sessionId: 's1' }),
    );
    expect(res.status).toBe(500);
  });

  it('returns 400 for invalid bodies (shared schema)', async () => {
    chainUpdate({ data: [{ id: 'x' }], error: null });
    for (const body of [
      {},
      { feedback: 'up', sessionId: 's1' },
      { mode: 'better', sessionId: 's1' },
      { mode: 'better', feedback: 'up' },
      'not-json{{',
    ]) {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
    }
  });

  it('updates the matching session row and returns updated:true', async () => {
    const { update, eq } = chainUpdate({ data: [{ id: 'log-1' }], error: null });
    const res = await POST(
      post({
        mode: 'better',
        provider: 'gemini',
        inputLength: 10,
        outputLength: 20,
        feedback: 'up',
        sessionId: 'sess-1',
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, updated: true });
    expect(update).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith('session_id', 'sess-1');
  });

  it('inserts when no row matches and attaches the user id when signed in', async () => {
    mockResolveIdentity.mockResolvedValue({ userId: 'u-1' });
    chainUpdate({ data: [], error: null });
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
      insert,
    });
    const res = await POST(
      post({ mode: 'specific', feedback: 'down', sessionId: 'sess-2' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, inserted: true });
    const row = insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row).toMatchObject({ session_id: 'sess-2', user_id: 'u-1' });
  });

  it('normalizes app modes for the DB check constraint', async () => {
    chainUpdate({ data: [{ id: 'log-1' }], error: null });
    const res = await POST(
      post({ mode: 'developer', feedback: 'up', sessionId: 'sess-3' }),
    );
    expect(res.status).toBe(200);
    const payload = mockFrom.mock.results[0]?.value.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.mode).toBe('better');
  });

  it('never leaks internal DB errors to the client (generic 500)', async () => {
    chainUpdate({ data: [], error: { message: 'relation \"optimization_logs\" does not exist' } });
    const insert = vi.fn().mockResolvedValue({ data: null, error: { message: 'column \"x\" does not exist' } });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: { message: 'boom' } }) }),
      }),
      insert,
    });
    const res = await POST(
      post({ mode: 'better', feedback: 'up', sessionId: 'sess-err' }),
    );
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe('Could not save feedback');
    expect(JSON.stringify(json)).not.toMatch(/relation|column|does not exist|boom/i);
  });
});
