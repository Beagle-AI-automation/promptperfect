import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

const { mockGetAdminClient } = vi.hoisted(() => ({
  mockGetAdminClient: vi.fn(),
}));

vi.mock('@/lib/server/supabase', () => ({
  getSupabaseAdminClient: (...args: unknown[]) => mockGetAdminClient(...args),
}));

describe('/api/healthz GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok with db=false when the admin client is not configured', async () => {
    mockGetAdminClient.mockReturnValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      status: string;
      db: boolean;
      uptime: number;
      timestamp: string;
    };
    expect(json.status).toBe('ok');
    expect(json.db).toBe(false);
    expect(typeof json.uptime).toBe('number');
    expect(() => new Date(json.timestamp)).not.toThrow();
  });

  it('reports db=true when the admin client is configured and leaks no secrets', async () => {
    mockGetAdminClient.mockReturnValue({ from: vi.fn() });
    const res = await GET();
    const raw = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(raw)).toMatchObject({ status: 'ok', db: true });
    // Must not expose env var names or any credential material.
    expect(raw).not.toMatch(/SERVICE_ROLE|ANON|SUPABASE_|key/i);
  });
});
