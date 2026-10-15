import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const { mockGetUser, mockGetAdminClient, mockUpdate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetAdminClient: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/server/supabase', () => ({
  createRouteHandlerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
  getSupabaseAdminClient: (...args: unknown[]) => mockGetAdminClient(...args),
}));

vi.mock('@/lib/auth/rateLimit', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/auth/rateLimit')>();
  return { ...actual, checkRateLimit: () => true };
});

function post(body: unknown) {
  return new Request('http://localhost/api/auth/update-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/auth/update-user POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null });
    const eq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle }) });
    mockUpdate.mockReturnValue({ eq });
    mockGetAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ update: mockUpdate }) });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(post({ provider: 'gemini' }));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the database is not configured', async () => {
    mockGetAdminClient.mockReturnValue(null);
    const res = await POST(post({ provider: 'gemini' }));
    expect(res.status).toBe(503);
  });

  it('rejects invalid provider, model, and oversized api_key', async () => {
    for (const body of [
      { provider: 'evil' },
      { model: '' },
      { model: 'x'.repeat(129) },
      { api_key: 'x'.repeat(2001) },
    ]) {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
    }
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('persists validated updates scoped to the user', async () => {
    const { update } = { update: mockUpdate };
    const res = await POST(
      post({ provider: 'OpenAI', model: 'gpt-6-astra', api_key: 'sk-test' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({
      provider: 'openai',
      model: 'gpt-6-astra',
      api_key: 'sk-test',
    });
    const eq = update.mock.results[0]?.value.eq as ReturnType<typeof vi.fn>;
    expect(eq).toHaveBeenCalledWith('id', 'user-123');
  });

  it('returns 404 when no profile row exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle }) });
    mockUpdate.mockReturnValue({ eq });
    const res = await POST(post({ provider: 'gemini' }));
    expect(res.status).toBe(404);
  });

  it('never leaks internal DB errors to the client (generic 500)', async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'relation "pp_users" does not exist' } });
    const eq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle }) });
    mockUpdate.mockReturnValue({ eq });
    const res = await POST(post({ provider: 'gemini' }));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe('Update failed');
    expect(JSON.stringify(json)).not.toMatch(/relation|does not exist/i);
  });
});
