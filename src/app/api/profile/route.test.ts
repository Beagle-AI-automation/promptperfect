import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as auth from '@/lib/server/supabaseRequestIdentity';
import { GET, PATCH } from './route';

const { mockGetAdminClient } = vi.hoisted(() => ({
  mockGetAdminClient: vi.fn(),
}));

vi.mock('@/lib/server/supabase', () => ({
  getSupabaseAdminClient: (...args: unknown[]) => mockGetAdminClient(...args),
}));

vi.mock('@/lib/server/optimizationLogStats', () => ({
  computeOptimizationFeedbackAnalytics: vi.fn().mockResolvedValue({
    thumbsUp: 4,
    thumbsDown: 1,
    avgScore: 85,
  }),
}));

vi.mock('@/lib/auth/rateLimit', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/auth/rateLimit')>();
  return { ...actual, checkRateLimit: () => true };
});

const IDENTITY = { userId: 'user-1', email: 'u@example.com', token: 'tok' };

const PROFILE_ROW = {
  id: 'user-1',
  email: 'u@example.com',
  display_name: 'Tester',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

const HIST_ROWS = [
  { id: 'h1', mode: 'better', provider: 'gemini', optimize_session_id: 's1' },
  { id: 'h2', mode: 'better', provider: 'openai', optimize_session_id: 's2' },
  { id: 'h3', mode: 'cot', provider: 'gemini', optimize_session_id: 's3' },
];

function mockConfirmedAdmin() {
  const getUserById = vi.fn().mockResolvedValue({
    data: { user: { email_confirmed_at: '2026-01-01T00:00:00.000Z' } },
    error: null,
  });
  const ppUsersMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const adminFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: ppUsersMaybeSingle }),
    }),
  });
  mockGetAdminClient.mockReturnValue({
    auth: { admin: { getUserById } },
    from: adminFrom,
  });
}

/** db mock for the GET happy path (existing profile, providers set). */
function mockDbForGet() {
  const profileMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: PROFILE_ROW, error: null });
  const dbSelect = (cols: string) => {
    if (cols === '*') {
      return { eq: vi.fn().mockResolvedValue({ count: 3, error: null }) };
    }
    if (cols.startsWith('id, mode')) {
      return { eq: vi.fn().mockResolvedValue({ data: HIST_ROWS, error: null }) };
    }
    return { eq: vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle }) };
  };
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn((cols: string) => dbSelect(cols)),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
    }),
  };
}

describe('/api/profile GET', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(IDENTITY);
    vi.spyOn(auth, 'jsonUnauthorizedDetails').mockResolvedValue({
      error: 'Unauthorized',
      hint: 'No session',
      code: 'NO_CREDENTIALS',
    });
    vi.spyOn(auth, 'getDbForIdentity').mockReturnValue(null);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(undefined);
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when the email is not confirmed', async () => {
    const getUserById = vi.fn().mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    mockGetAdminClient.mockReturnValue({
      auth: { admin: { getUserById } },
      from: vi.fn(),
    });
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(403);
    expect((await res.json()) as { code?: string }).toMatchObject({
      code: 'EMAIL_NOT_CONFIRMED',
    });
  });

  it('returns the profile with aggregated stats', async () => {
    mockConfirmedAdmin();
    vi.spyOn(auth, 'getDbForIdentity').mockReturnValue(mockDbForGet() as never);
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      profile?: Record<string, unknown>;
      stats?: Record<string, unknown>;
    };
    expect(json.profile).toMatchObject({
      id: 'user-1',
      email: 'u@example.com',
      display_name: 'Tester',
      optimization_count: 3,
    });
    expect(json.stats).toMatchObject({
      total: 3,
      favoriteMode: 'better',
      favoriteProvider: 'gemini',
      thumbsUp: 4,
      thumbsDown: 1,
    });
  });
});

describe('/api/profile PATCH', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(IDENTITY);
    vi.spyOn(auth, 'jsonUnauthorizedDetails').mockResolvedValue({
      error: 'Unauthorized',
      hint: 'No session',
      code: 'NO_CREDENTIALS',
    });
    vi.spyOn(auth, 'getDbForIdentity').mockReturnValue(null);
    mockConfirmedAdmin();
  });

  function patch(body: unknown) {
    return new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 401 when unauthenticated', async () => {
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(undefined);
    const res = await PATCH(patch({ display_name: 'X' }));
    expect(res.status).toBe(401);
  });

  it('validates display_name and avatar_url', async () => {
    for (const body of [
      {},
      { display_name: 'x'.repeat(65) },
      { avatar_url: 'http://insecure/img.png' },
    ]) {
      const res = await PATCH(patch(body));
      expect(res.status).toBe(400);
    }
  });

  it('upserts the profile and returns it', async () => {
    const updated = { ...PROFILE_ROW, display_name: 'New Name' };
    const currentMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: PROFILE_ROW, error: null });
    const upsertMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: updated, error: null });
    const select = vi.fn((cols: string) => {
      if (cols === '*') {
        return { eq: vi.fn().mockResolvedValue({ count: 3, error: null }) };
      }
      return { eq: vi.fn().mockReturnValue({ maybeSingle: currentMaybeSingle }) };
    });
    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ maybeSingle: upsertMaybeSingle }),
    });
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const countSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
    });
    vi.spyOn(auth, 'getDbForIdentity').mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'pp_user_profiles') return { select, upsert };
        if (table === 'pp_optimization_history') return { select: countSelect };
        return { update };
      }),
    } as never);

    const res = await PATCH(
      patch({ display_name: 'New Name', avatar_url: 'https://example.com/a.png' }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { profile?: Record<string, unknown> };
    expect(json.profile).toMatchObject({
      id: 'user-1',
      display_name: 'New Name',
      optimization_count: 3,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', display_name: 'New Name' }),
      { onConflict: 'id' },
    );
  });
});
