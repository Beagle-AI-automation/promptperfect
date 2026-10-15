import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as auth from '@/lib/server/supabaseRequestIdentity';
import { POST } from './route';

const { mockGetAdminClient } = vi.hoisted(() => ({
  mockGetAdminClient: vi.fn(),
}));

vi.mock('@/lib/server/supabase', () => ({
  getSupabaseAdminClient: (...args: unknown[]) => mockGetAdminClient(...args),
}));

const IDENTITY = { userId: 'user-1', email: 'u@example.com', token: 'tok' };
const HISTORY_ID = '123e4567-e89b-12d3-a456-426614174000';

function post(body: unknown) {
  return new NextRequest('http://localhost/api/share/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/share/generate POST', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(IDENTITY);
    vi.spyOn(auth, 'jsonUnauthorizedDetails').mockResolvedValue({
      error: 'Unauthorized',
      hint: 'No session',
      code: 'NO_CREDENTIALS',
    });
  });

  it('returns 401 when unauthenticated', async () => {
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(undefined);
    const res = await POST(post({ historyId: HISTORY_ID }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for a missing or malformed historyId', async () => {
    for (const body of [{}, { historyId: '' }, { historyId: 'not-a-uuid' }]) {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
    }
  });

  it('returns 503 when the database is not configured', async () => {
    mockGetAdminClient.mockReturnValue(null);
    const res = await POST(post({ historyId: HISTORY_ID }));
    expect(res.status).toBe(503);
  });

  it('returns 404 when the row is missing or belongs to someone else', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mockGetAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) });

    const res = await POST(post({ historyId: HISTORY_ID }));
    expect(res.status).toBe(404);

    maybeSingle.mockResolvedValue({
      data: { share_id: null, user_id: 'someone-else' },
      error: null,
    });
    const res2 = await POST(post({ historyId: HISTORY_ID }));
    expect(res2.status).toBe(404);
  });

  it('returns the existing share URL without writing', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { share_id: 'abc123', user_id: IDENTITY.userId },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    mockGetAdminClient.mockReturnValue({ from });

    const res = await POST(post({ historyId: HISTORY_ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      shareId: 'abc123',
      shareUrl: 'http://localhost/s/abc123',
    });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('mints a share id and returns the new URL', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { share_id: null, user_id: IDENTITY.userId },
      error: null,
    });
    const selectEq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq: selectEq });
    const updateDone = vi.fn().mockResolvedValue({ error: null });
    const updateEq2 = vi.fn().mockReturnValue(updateDone);
    const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 });
    const update = vi.fn().mockReturnValue({ eq: updateEq1 });
    const from = vi
      .fn()
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ update });
    mockGetAdminClient.mockReturnValue({ from });

    const res = await POST(post({ historyId: HISTORY_ID }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { shareId?: string; shareUrl?: string };
    expect(typeof json.shareId).toBe('string');
    expect(json.shareId?.length).toBeGreaterThan(0);
    expect(json.shareUrl).toBe(`http://localhost/s/${json.shareId}`);
    expect(update).toHaveBeenCalledWith({ share_id: json.shareId });
  });

  it('never leaks internal errors to the client (generic 500)', async () => {
    // Force the outer catch: make the DB client throw after UUID validation.
    const from = vi.fn().mockImplementation(() => {
      throw new Error('column "secret" does not exist');
    });
    mockGetAdminClient.mockReturnValue({ from });

    const res = await POST(post({ historyId: HISTORY_ID }));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe('Internal server error');
    expect(JSON.stringify(json)).not.toMatch(/column|secret|does not exist/i);
  });
});
