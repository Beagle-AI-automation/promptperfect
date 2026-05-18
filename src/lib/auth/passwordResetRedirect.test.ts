import { describe, it, expect } from 'vitest';
import {
  buildPasswordResetRedirectUrl,
  mapPasswordResetEmailError,
  resolvePasswordResetRedirect,
} from './passwordResetRedirect';

describe('passwordResetRedirect', () => {
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
});
