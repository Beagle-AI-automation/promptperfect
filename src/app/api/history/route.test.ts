import { describe, it, expect, vi, afterEach } from 'vitest';
import * as auth from '@/lib/server/supabaseRequestIdentity';
import { GET } from './route';

describe('API session auth (/api/history GET)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(undefined);
    vi.spyOn(auth, 'jsonUnauthorizedDetails').mockResolvedValue({
      error: 'Unauthorized',
      hint: 'No session',
      code: 'NO_CREDENTIALS',
    });

    const res = await GET(new Request('http://localhost/api/history'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with items when authenticated', async () => {
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue({
      userId: '00000000-0000-4000-8000-000000000001',
      email: 't@example.com',
      token: 'tok',
    });

    const mockLimit = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.spyOn(auth, 'getDbForIdentity').mockReturnValue({
      from: mockFrom,
    } as never);

    const res = await GET(new Request('http://localhost/api/history'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items?: unknown[] };
    expect(Array.isArray(json.items)).toBe(true);
  });

  it('returns 401 when bearer is rejected (tampered / invalid token)', async () => {
    vi.spyOn(auth, 'resolveIdentity').mockResolvedValue(undefined);
    vi.spyOn(auth, 'jsonUnauthorizedDetails').mockResolvedValue({
      error: 'Unauthorized',
      hint: 'Bearer token was rejected',
      code: 'BEARER_REJECTED',
    });

    const res = await GET(
      new Request('http://localhost/api/history', {
        headers: { Authorization: 'Bearer invalid.jwt.here' },
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('BEARER_REJECTED');
  });
});
