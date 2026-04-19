import { describe, it, expect } from 'vitest';
import { GUEST_LIMIT } from '@/lib/guest';
import { GET, POST } from './route';

describe('/api/guest-usage GET', () => {
  it('returns default count and limit when guestId is missing', async () => {
    const res = await GET(new Request('http://localhost/api/guest-usage'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(0);
    expect(data.limit).toBe(GUEST_LIMIT);
    expect(data.remaining).toBe(GUEST_LIMIT);
    expect(data.serverTracking).toBe(true);
  });
});

describe('/api/guest-usage POST', () => {
  it('returns 400 when guestId is missing', async () => {
    const res = await POST(
      new Request('http://localhost/api/guest-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Guest ID required/i);
  });

  it('returns persisted false and limit when Supabase is not configured', async () => {
    const res = await POST(
      new Request('http://localhost/api/guest-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId: 'guest_test123' }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.persisted).toBe(false);
    expect(data.limit).toBe(GUEST_LIMIT);
  });
});
