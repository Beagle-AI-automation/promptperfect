import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildPasswordResetRedirectUrl,
  mapPasswordResetEmailError,
  resolvePasswordResetRedirect,
} from './passwordResetRedirect';

describe('passwordResetRedirect', () => {
  let savedSiteUrl: string | undefined;

  beforeEach(() => {
    savedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (savedSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = savedSiteUrl;
    vi.unstubAllEnvs();
  });

  it('builds /auth/reset from origin', () => {
    expect(buildPasswordResetRedirectUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/auth/reset',
    );
  });

  it('prefers validated client redirectTo', () => {
    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      headers: { host: 'localhost:3000' },
    });
    expect(
      resolvePasswordResetRedirect(
        req,
        'http://localhost:3000/auth/reset',
      ),
    ).toBe('http://localhost:3000/auth/reset');
  });

  it('maps Supabase security cooldown errors', () => {
    const { code, error } = mapPasswordResetEmailError(
      'For security purposes, you can only request this after 59 seconds.',
      'http://localhost:3000/auth/reset',
    );
    expect(code).toBe('EMAIL_RATE_LIMIT');
    expect(error).toMatch(/59 seconds/i);
    expect(error).toMatch(/inbox/i);
  });

  it('maps redirect allowlist errors', () => {
    const { code, error } = mapPasswordResetEmailError(
      'redirect url is not allowed',
      'http://localhost:3000/auth/reset',
    );
    expect(code).toBe('REDIRECT_NOT_ALLOWLISTED');
    expect(error).toContain('http://localhost:3000/auth/reset');
  });

  it('prefers forwarded host/proto over the host header', () => {
    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      headers: {
        host: 'internal:3000',
        'x-forwarded-host': 'shop.example.com',
        'x-forwarded-proto': 'https',
      },
    });
    expect(resolvePasswordResetRedirect(req)).toBe(
      'https://shop.example.com/auth/reset',
    );
  });

  it('rejects mismatched or malformed client redirectTo', () => {
    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      headers: { host: 'localhost:3000' },
    });
    expect(
      resolvePasswordResetRedirect(req, 'https://evil.com/auth/reset'),
    ).toBe('http://localhost:3000/auth/reset');
    expect(
      resolvePasswordResetRedirect(req, 'http://localhost:3000/other'),
    ).toBe('http://localhost:3000/auth/reset');
    expect(resolvePasswordResetRedirect(req, 'not a url')).toBe(
      'http://localhost:3000/auth/reset',
    );
  });

  it('falls back to the site URL env without a request host', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com/';
    const req = { headers: new Headers() } as Request;
    expect(resolvePasswordResetRedirect(req)).toBe(
      'https://app.example.com/auth/reset',
    );
  });

  it('defaults to localhost without host or env', () => {
    const req = { headers: new Headers() } as Request;
    expect(resolvePasswordResetRedirect(req)).toBe(
      'http://localhost:3000/auth/reset',
    );
  });

  it('maps SMTP errors', () => {
    const { code } = mapPasswordResetEmailError(
      'SMTP not configured',
      'http://localhost:3000/auth/reset',
    );
    expect(code).toBe('EMAIL_NOT_CONFIGURED');
  });

  it('maps unknown-account errors', () => {
    const { code } = mapPasswordResetEmailError(
      'User not found',
      'http://localhost:3000/auth/reset',
    );
    expect(code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('details unknown errors in dev, generic in production', () => {
    const dev = mapPasswordResetEmailError(
      'weird boom',
      'http://localhost:3000/auth/reset',
    );
    expect(dev.code).toBe('RESET_EMAIL_FAILED');
    expect(dev.error).toContain('weird boom');
    vi.stubEnv('NODE_ENV', 'production');
    const prod = mapPasswordResetEmailError(
      'weird boom',
      'http://localhost:3000/auth/reset',
    );
    expect(prod.code).toBe('RESET_EMAIL_FAILED');
    expect(prod.error).not.toContain('weird boom');
  });
});
