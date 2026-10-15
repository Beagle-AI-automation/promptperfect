import { describe, it, expect } from 'vitest';
import { mapOAuthCallbackError } from './mapOAuthCallbackError';

describe('mapOAuthCallbackError', () => {
  it('maps Google profile fetch failures', () => {
    const msg = mapOAuthCallbackError(
      'Error getting user profile from external provider',
      'bad_oauth_callback',
    );
    expect(msg).toMatch(/Google Cloud Console/i);
    expect(msg).toMatch(/supabase\.co\/auth\/v1\/callback/i);
  });

  it('passes through unknown messages', () => {
    expect(mapOAuthCallbackError('Custom failure')).toBe('Custom failure');
  });

  it('maps profile phrases without a code', () => {
    expect(
      mapOAuthCallbackError('Error getting user profile, please retry'),
    ).toMatch(/Google Cloud Console/i);
    expect(
      mapOAuthCallbackError('Failed: user profile from external provider'),
    ).toMatch(/Google Cloud Console/i);
  });

  it('maps duplicate-email failures', () => {
    expect(mapOAuthCallbackError('Email already registered')).toMatch(
      /already exists/i,
    );
  });

  it('maps expired oauth state', () => {
    expect(mapOAuthCallbackError('boom', 'bad_oauth_state')).toMatch(
      /expired or was interrupted/i,
    );
    expect(mapOAuthCallbackError('Invalid oauth state token')).toMatch(
      /expired or was interrupted/i,
    );
  });

  it('maps cancelled sign-in', () => {
    expect(mapOAuthCallbackError('access_denied by user')).toMatch(
      /cancelled/i,
    );
    expect(mapOAuthCallbackError('User cancelled the prompt')).toMatch(
      /cancelled/i,
    );
  });

  it('maps redirect URL mismatch', () => {
    expect(mapOAuthCallbackError('redirect url is not allowlisted')).toMatch(
      /Redirect URL mismatch/i,
    );
  });

  it('defaults empty messages', () => {
    expect(mapOAuthCallbackError('   ')).toBe('Sign-in failed. Please try again.');
  });
});
