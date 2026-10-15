import { describe, expect, it, vi } from 'vitest';
import { jsonLoginSuccess } from './jsonLoginSuccess';

const AUTH_PAYLOAD = {
  session: { access_token: 'at', refresh_token: 'rt' },
  user: { id: 'auth-1' },
} as never;

function mockAdmin(sequence: Array<{ data: unknown }>) {
  const queue = [...sequence];
  const maybeSingle = vi.fn(async () => queue.shift() ?? { data: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const insert = vi.fn().mockResolvedValue({});
  return { from: vi.fn().mockReturnValue({ select, insert }), insert };
}

describe('jsonLoginSuccess', () => {
  it('returns the existing row with session tokens', async () => {
    const admin = mockAdmin([{ data: { id: 'auth-1', email: 'u@x.com' } }]);
    const res = await jsonLoginSuccess(admin as never, AUTH_PAYLOAD, 'u@x.com', 'u@x.com');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { user?: object; session?: object };
    expect(json.user).toMatchObject({ id: 'auth-1' });
    expect(json.session).toMatchObject({ access_token: 'at' });
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it('adopts the row matched by email', async () => {
    const admin = mockAdmin([
      { data: null },
      { data: { id: 'other', email: 'u@x.com' } },
    ]);
    const res = await jsonLoginSuccess(admin as never, AUTH_PAYLOAD, 'u@x.com', 'u@x.com');
    expect(res.status).toBe(200);
    expect((await res.json()) as object).toMatchObject({
      user: { id: 'other' },
    });
  });

  it('inserts a fresh row when none exists', async () => {
    const admin = mockAdmin([
      { data: null },
      { data: null },
      { data: { id: 'auth-1', email: 'u@x.com' } },
    ]);
    const res = await jsonLoginSuccess(admin as never, AUTH_PAYLOAD, 'u@x.com', 'u@x.com');
    expect(res.status).toBe(200);
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'auth-1', provider: 'gemini' }),
    );
  });

  it('returns 401 when no row can be resolved', async () => {
    const admin = mockAdmin([{ data: null }, { data: null }, { data: null }]);
    const res = await jsonLoginSuccess(admin as never, AUTH_PAYLOAD, 'u@x.com', 'u@x.com');
    expect(res.status).toBe(401);
  });
});
