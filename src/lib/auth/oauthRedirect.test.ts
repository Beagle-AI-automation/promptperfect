import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPasswordResetOrigin,
  getSiteOriginForAuth,
  getEmailConfirmationRedirectUrl,
  getOAuthCallbackUrl,
  getPasswordResetRedirectUrl,
} from './oauthRedirect';

const ENV_KEYS = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_URL'] as const;

describe('oauthRedirect', () => {
  let saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  function req(headers: Record<string, string> = {}) {
    return new Request('http://localhost:3000/api/x', { headers });
  }

  it('getPasswordResetOrigin prefers forwarded host/proto', () => {
    const r = req({
      'x-forwarded-host': 'shop.example.com',
      'x-forwarded-proto': 'https',
      host: 'internal:3000',
    });
    expect(getPasswordResetOrigin(r)).toBe('https://shop.example.com');
  });

  it('getPasswordResetOrigin falls back to the host header', () => {
    expect(getPasswordResetOrigin(req())).toBe('http://localhost:3000');
  });

  it('getPasswordResetOrigin falls back to site origin without headers', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com/';
    const r = { headers: new Headers() } as Request;
    expect(getPasswordResetOrigin(r)).toBe('https://app.example.com');
  });

  it('getSiteOriginForAuth prefers NEXT_PUBLIC_SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com/';
    expect(getSiteOriginForAuth(req())).toBe('https://app.example.com');
  });

  it('getSiteOriginForAuth uses VERCEL_URL with and without scheme', () => {
    process.env.VERCEL_URL = 'myapp.vercel.app';
    expect(getSiteOriginForAuth(req())).toBe('https://myapp.vercel.app');
    process.env.VERCEL_URL = 'https://other.vercel.app/';
    expect(getSiteOriginForAuth(req())).toBe('https://other.vercel.app');
  });

  it('getSiteOriginForAuth prefers forwarded host/proto', () => {
    const r = req({
      'x-forwarded-host': 'shop.example.com',
      'x-forwarded-proto': 'https',
      host: 'internal:3000',
    });
    expect(getSiteOriginForAuth(r)).toBe('https://shop.example.com');
  });

  it('getSiteOriginForAuth derives from the request host', () => {
    expect(getSiteOriginForAuth(req({ host: 'preview-1.vercel.app' }))).toBe(
      'http://preview-1.vercel.app',
    );
  });

  it('getSiteOriginForAuth defaults to localhost', () => {
    const r = { headers: new Headers() } as Request;
    expect(getSiteOriginForAuth(r)).toBe('http://localhost:3000');
  });

  it('getEmailConfirmationRedirectUrl appends the callback path', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com';
    expect(getEmailConfirmationRedirectUrl(req())).toBe(
      'https://app.example.com/auth/callback',
    );
  });

  it('browser helpers use the current tab origin', () => {
    expect(getOAuthCallbackUrl()).toMatch(/^https?:\/\/.+\/auth\/callback$/);
    expect(getPasswordResetRedirectUrl()).toMatch(
      /^https?:\/\/.+\/auth\/reset$/,
    );
  });

  it('server fallbacks use the site URL env without window (SSR)', () => {
    vi.stubGlobal('window', undefined);
    try {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com/';
      expect(getOAuthCallbackUrl()).toBe(
        'https://app.example.com/auth/callback',
      );
      expect(getPasswordResetRedirectUrl()).toBe(
        'https://app.example.com/auth/reset',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('server fallbacks default to relative paths without env', () => {
    vi.stubGlobal('window', undefined);
    try {
      expect(getOAuthCallbackUrl()).toBe('/auth/callback');
      expect(getPasswordResetRedirectUrl()).toBe('/auth/reset');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
