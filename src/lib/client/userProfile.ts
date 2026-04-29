'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';
import { getOrCreateSessionId } from '@/lib/client/optimizationHistory';
import { clearGuestLocalStorage, getStoredGuestId } from '@/lib/guest';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  optimization_count: number;
  created_at: string;
}

export interface UserStats {
  total: number;
  favoriteMode: string | null;
  favoriteProvider: string | null;
  /** From `optimization_logs` (per-session feedback), same source as app analytics. */
  thumbsUp: number;
  thumbsDown: number;
}

export type ProfileLoadError = {
  status: number;
  error: string;
  hint?: string;
  code?: string;
};

export type ProfileLoadResult =
  | { ok: true; profile: UserProfile; stats: UserStats }
  | { ok: false; detail: ProfileLoadError };

function browserClient(): SupabaseClient | null {
  return createSupabaseBrowserClient();
}

/**
 * Load profile + dashboard stats in one request (preferred on `/profile`).
 * Uses `/api/profile` with session Bearer + matching user headers and service role where configured.
 */
export async function fetchProfileFromApi(
  supabase: SupabaseClient | null = browserClient(),
): Promise<ProfileLoadResult> {
  if (!supabase) {
    return {
      ok: false,
      detail: {
        status: 503,
        error: 'Supabase is not configured',
        code: 'NO_CLIENT',
      },
    };
  }

  const headers = await getPromptPerfectAuthHeaders(supabase);
  if (!headers) {
    return {
      ok: false,
      detail: {
        status: 401,
        error: 'Not signed in',
        code: 'NO_AUTH_HEADERS',
      },
    };
  }

  const res = await fetch('/api/profile', { headers });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    hint?: string;
    code?: string;
    profile?: UserProfile;
    stats?: UserStats;
  };

  if (!res.ok || !payload.profile) {
    return {
      ok: false,
      detail: {
        status: res.status,
        error: payload.error || `Request failed (${res.status})`,
        hint: payload.hint,
        code: payload.code,
      },
    };
  }

  const stats: UserStats = payload.stats ?? {
    total: payload.profile.optimization_count ?? 0,
    favoriteMode: null,
    favoriteProvider: null,
    thumbsUp: 0,
    thumbsDown: 0,
  };

  return { ok: true, profile: payload.profile, stats };
}

/** @param userId — when set, returns null if the API profile id does not match */
export async function getUserProfile(
  userId: string,
  supabase: SupabaseClient | null = browserClient(),
): Promise<UserProfile | null> {
  const r = await fetchProfileFromApi(supabase);
  if (!r.ok) return null;
  if (userId && r.profile.id !== userId) return null;
  return r.profile;
}

/** @param userId — unused for API path; kept for API compatibility with PP-504 */
export async function getUserStats(
  userId: string,
  supabase: SupabaseClient | null = browserClient(),
): Promise<UserStats> {
  const r = await fetchProfileFromApi(supabase);
  if (!r.ok) {
    return {
      total: 0,
      favoriteMode: null,
      favoriteProvider: null,
      thumbsUp: 0,
      thumbsDown: 0,
    };
  }
  if (userId && r.profile.id !== userId) {
    return {
      total: 0,
      favoriteMode: null,
      favoriteProvider: null,
      thumbsUp: 0,
      thumbsDown: 0,
    };
  }
  return r.stats;
}

export async function updateUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string | null },
  supabase: SupabaseClient | null = browserClient(),
): Promise<{ error: Error | null; profile?: UserProfile }> {
  const client = supabase ?? browserClient();
  if (!client) {
    return { error: new Error('Supabase is not configured') };
  }

  const headers = await getPromptPerfectAuthHeaders(client);
  if (!headers) {
    return { error: new Error('Not signed in') };
  }

  const body: Record<string, string | null> = {};
  if (updates.display_name !== undefined) {
    body.display_name = updates.display_name;
  }
  if (updates.avatar_url !== undefined) {
    body.avatar_url = updates.avatar_url;
  }

  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    profile?: UserProfile;
  };

  if (!res.ok) {
    return {
      error: new Error(payload.error || 'Update failed'),
    };
  }

  if (payload.profile && payload.profile.id !== userId) {
    return { error: new Error('Profile mismatch') };
  }

  return { error: null, profile: payload.profile };
}

/**
 * Guest → user: moves `pp_optimization_history` rows from `guestId` (`pp_guest_id`)
 * into the signed-in session and attaches `user_id`. Clears `pp_guest_id` / `pp_guest_count` on success.
 */
export async function migrateGuestHistory(
  guestId: string,
): Promise<{ error: Error | null }> {
  if (!guestId.startsWith('guest_')) {
    return { error: new Error('Invalid guest id') };
  }

  const targetSessionId = getOrCreateSessionId();
  if (!targetSessionId) {
    return { error: new Error('No session id') };
  }

  try {
    const res = await fetch('/api/auth/claim-guest-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ guestId, targetSessionId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        error: new Error(body.error || 'Migration failed'),
      };
    }
    clearGuestLocalStorage();
    return { error: null };
  } catch (e) {
    return {
      error: e instanceof Error ? e : new Error('Migration failed'),
    };
  }
}

/** Same as `migrateGuestHistory(getStoredGuestId())` when `pp_guest_id` exists. */
export async function migrateGuestHistoryIfNeeded(): Promise<{
  error: Error | null;
  ran: boolean;
}> {
  const guestId = getStoredGuestId();
  if (!guestId.startsWith('guest_')) {
    return { error: null, ran: false };
  }
  const { error } = await migrateGuestHistory(guestId);
  return { error, ran: true };
}
