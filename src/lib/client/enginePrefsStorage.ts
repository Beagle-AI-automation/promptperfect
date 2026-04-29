'use client';

import type { User } from '@supabase/supabase-js';

/** Persisted AI engine defaults only — never identity (id/email come from the Supabase session). */
export const ENGINE_PREFS_STORAGE_KEY = 'promptperfect:engine_prefs';

export type EnginePrefs = {
  provider?: string;
  model?: string;
};

export function readEnginePrefs(): EnginePrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ENGINE_PREFS_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as EnginePrefs;
    return o && typeof o === 'object' ? o : null;
  } catch {
    return null;
  }
}

export function writeEnginePrefs(prefs: EnginePrefs): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = readEnginePrefs() ?? {};
    localStorage.setItem(
      ENGINE_PREFS_STORAGE_KEY,
      JSON.stringify({ ...prev, ...prefs }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearEnginePrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ENGINE_PREFS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function displayNameFromUserMetadata(user: User): string | null {
  const full =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '';
  const name =
    typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name.trim()
      : '';
  return full || name || null;
}

/** Build in-memory app user shape from Auth `User` + optional persisted engine prefs. */
export function buildAppUserFromSupabaseUser(
  user: User,
  prefs: EnginePrefs | null,
): {
  id: string;
  name: string | null;
  email: string;
  provider: string;
  model: string;
} {
  return {
    id: user.id,
    email: user.email?.trim() ?? '',
    name: displayNameFromUserMetadata(user),
    provider:
      typeof prefs?.provider === 'string' && prefs.provider
        ? prefs.provider
        : 'gemini',
    model:
      typeof prefs?.model === 'string' && prefs.model
        ? prefs.model
        : 'gemini-2.0-flash',
  };
}
