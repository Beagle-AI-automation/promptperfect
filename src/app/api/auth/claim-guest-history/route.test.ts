import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const {
  mockGetUser,
  mockFrom,
  mockSelectIds,
  mockDeleteEq,
  mockGetAdminClient,
} = vi.hoisted(() => {
  const mockSelectIds = vi.fn();
  const mockIs = vi.fn(() => ({ select: mockSelectIds }));
  const mockEq = vi.fn(() => ({ is: mockIs }));
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockDeleteEq = vi.fn();
  const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));
  const mockFrom = vi.fn((table: string) => {
    if (table === 'pp_optimization_history') return { update: mockUpdate };
    if (table === 'guest_usage') return { delete: mockDelete };
    return {};
  });
  return {
    mockGetUser: vi.fn(),
    mockFrom,
    mockSelectIds,
    mockDeleteEq,
    mockGetAdminClient: vi.fn(),
  };
});

vi.mock('@/lib/server/supabase', () => ({
  createRouteHandlerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
  getSupabaseAdminClient: (...args: unknown[]) =>
    mockGetAdminClient(...args),
}));

const GUEST_ID = 'guest-abc-123';
const TARGET_SESSION = '550e8400-e29b-41d4-a716-446655440000';

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/claim-guest-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/auth/claim-guest-history POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockGetAdminClient.mockReturnValue({ from: mockFrom });
    mockSelectIds.mockResolvedValue({
      data: [{ id: 'h1' }, { id: 'h2' }],
      error: null,
    });
    mockDeleteEq.mockResolvedValue({ error: null });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });
    const res = await POST(
      makeRequest({ guestId: GUEST_ID, targetSessionId: TARGET_SESSION }),
    );
    expect(res.status).toBe(401);
  });

  it.each([
    ['missing body fields', {}],
    ['malformed guestId', { guestId: '!!!', targetSessionId: TARGET_SESSION }],
    ['missing targetSessionId', { guestId: GUEST_ID }],
    [
      'oversized targetSessionId',
      { guestId: GUEST_ID, targetSessionId: 'x'.repeat(201) },
    ],
    [
      'guest claiming itself',
      { guestId: GUEST_ID, targetSessionId: GUEST_ID },
    ],
  ])('returns 400 on %s', async (_label, body) => {
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it('skips gracefully when the database is not configured', async () => {
    mockGetAdminClient.mockReturnValueOnce(null);
    const res = await POST(
      makeRequest({ guestId: GUEST_ID, targetSessionId: TARGET_SESSION }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      skipped: true,
      migrated: 0,
    });
  });

  it('returns 500 when the claim update fails', async () => {
    mockSelectIds.mockResolvedValueOnce({
      data: null,
      error: { message: 'boom' },
    });
    const res = await POST(
      makeRequest({ guestId: GUEST_ID, targetSessionId: TARGET_SESSION }),
    );
    expect(res.status).toBe(500);
  });

  it('migrates unclaimed rows and cleans up guest usage', async () => {
    const res = await POST(
      makeRequest({ guestId: GUEST_ID, targetSessionId: TARGET_SESSION }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, migrated: 2 });
    expect(mockFrom).toHaveBeenCalledWith('pp_optimization_history');
    expect(mockFrom).toHaveBeenCalledWith('guest_usage');
  });
});
