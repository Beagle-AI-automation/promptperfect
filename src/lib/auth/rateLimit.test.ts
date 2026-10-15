import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  checkRateLimit,
  enforceRateLimit,
  getClientIp,
  rateLimitKey,
  rateLimitResponse,
  resetRateLimits,
  trackedRateLimitKeys,
} from './rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_UNLIMITED_MODE;
    vi.useRealTimers();
    resetRateLimits();
  });

  it('allows attempts up to the limit, then blocks', () => {
    const ip = 'rate-test-limit';
    expect(checkRateLimit(ip, 3)).toBe(true);
    expect(checkRateLimit(ip, 3)).toBe(true);
    expect(checkRateLimit(ip, 3)).toBe(true);
    expect(checkRateLimit(ip, 3)).toBe(false);
  });

  it('defaults to 5 attempts per minute', () => {
    const ip = 'rate-test-default';
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(ip)).toBe(true);
    }
    expect(checkRateLimit(ip)).toBe(false);
  });

  it('tracks IPs independently', () => {
    expect(checkRateLimit('rate-test-a', 1)).toBe(true);
    expect(checkRateLimit('rate-test-a', 1)).toBe(false);
    expect(checkRateLimit('rate-test-b', 1)).toBe(true);
  });

  it('opens a new window after 60 seconds', () => {
    vi.useFakeTimers();
    const ip = 'rate-test-window';
    expect(checkRateLimit(ip, 1)).toBe(true);
    expect(checkRateLimit(ip, 1)).toBe(false);
    vi.setSystemTime(Date.now() + 61_000);
    expect(checkRateLimit(ip, 1)).toBe(true);
  });

  it('disables throttling in unlimited local-dev mode', () => {
    process.env.NEXT_PUBLIC_UNLIMITED_MODE = 'true';
    const ip = 'rate-test-unlimited';
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ip, 1)).toBe(true);
    }
  });

  it('prunes expired windows so tracked keys stay bounded', () => {
    vi.useFakeTimers();
    // The map only prunes once it reaches MAX_TRACKED_KEYS, so fill it up.
    for (let i = 0; i < 10_000; i++) {
      checkRateLimit(`rate-flood-${i}`, 100);
    }
    expect(trackedRateLimitKeys()).toBe(10_000);

    // Every window above has now expired; the next call must prune them.
    vi.setSystemTime(Date.now() + 61_000);
    expect(checkRateLimit('rate-after-prune', 1)).toBe(true);
    expect(trackedRateLimitKeys()).toBe(1);
  });
});

describe('getClientIp', () => {
  function reqWith(headers: Record<string, string>): Request {
    return new Request('http://localhost/api/x', { headers });
  }

  it('returns "unknown" when no proxy header is present', () => {
    expect(getClientIp(reqWith({}))).toBe('unknown');
    expect(getClientIp(reqWith({ 'x-forwarded-for': '   ' }))).toBe('unknown');
  });

  it('takes the first hop of a comma-separated chain', () => {
    expect(getClientIp(reqWith({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18' }))).toBe(
      '203.0.113.9',
    );
  });

  it('trims whitespace around the address', () => {
    expect(getClientIp(reqWith({ 'x-forwarded-for': '  10.0.0.1  ' }))).toBe('10.0.0.1');
  });

  it('truncates absurdly long values so keys stay bounded', () => {
    const long = 'a'.repeat(500);
    expect(getClientIp(reqWith({ 'x-forwarded-for': long }))).toHaveLength(64);
  });
});

describe('route guard helpers', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    resetRateLimits();
  });

  function req(ip: string): Request {
    return new Request('http://localhost/api/x', {
      headers: { 'x-forwarded-for': ip },
    });
  }

  it('rateLimitResponse is a 429 with the shared error body', async () => {
    const res = rateLimitResponse();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: 'Too many requests. Please slow down.',
    });
  });

  it('enforceRateLimit returns null while under the limit', () => {
    expect(enforceRateLimit('guard-ok', req('guard-ok-ip'), 2)).toBeNull();
    expect(enforceRateLimit('guard-ok', req('guard-ok-ip'), 2)).toBeNull();
  });

  it('enforceRateLimit returns a 429 response once over the limit', async () => {
    expect(enforceRateLimit('guard-blocked', req('guard-blocked-ip'), 2)).toBeNull();
    expect(enforceRateLimit('guard-blocked', req('guard-blocked-ip'), 2)).toBeNull();
    const blocked = enforceRateLimit('guard-blocked', req('guard-blocked-ip'), 2);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
    expect(await blocked?.json()).toEqual({
      error: 'Too many requests. Please slow down.',
    });
  });

  it('resetRateLimits clears tracked windows', () => {
    checkRateLimit('guard-reset', 1);
    expect(checkRateLimit('guard-reset', 1)).toBe(false);
    resetRateLimits();
    expect(checkRateLimit('guard-reset', 1)).toBe(true);
  });
});

describe('rateLimitKey', () => {
  function reqWith(ip?: string): Request {
    return new Request('http://localhost/api/x', {
      headers: ip ? { 'x-forwarded-for': ip } : {},
    });
  }

  it('namespaces buckets by route, so endpoints have independent budgets', () => {
    const a = rateLimitKey('auth/login', reqWith('203.0.113.5'));
    const b = rateLimitKey('feedback', reqWith('203.0.113.5'));
    expect(a).toBe('auth/login:203.0.113.5');
    expect(a).not.toBe(b);
  });

  it('keeps one IP locked out of only the route it exhausted', () => {
    resetRateLimits();
    // Exhaust the feedback budget for this IP.
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(rateLimitKey('feedback', reqWith('203.0.113.6')), 3)).toBe(true);
    }
    expect(checkRateLimit(rateLimitKey('feedback', reqWith('203.0.113.6')), 3)).toBe(false);
    // The same IP still has a full login budget.
    expect(checkRateLimit(rateLimitKey('auth/login', reqWith('203.0.113.6')), 3)).toBe(true);
  });

  it('falls back to the "unknown" bucket when no proxy header is present', () => {
    expect(rateLimitKey('stats', reqWith())).toBe('stats:unknown');
  });
});

