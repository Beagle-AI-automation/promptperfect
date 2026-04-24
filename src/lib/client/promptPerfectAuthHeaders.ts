'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyAuthUserToPpUserStorage,
  resolveAuthUserAndSession,
} from '@/lib/client/ppUserSync';

function readPpUserAuthHeaders(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('pp_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { id?: string; email?: string };
    const id = typeof u.id === 'string' ? u.id.trim() : '';
    const email = typeof u.email === 'string' ? u.email.trim() : '';
    if (!id || !email) return null;
    return {
      'X-PP-User-Id': id,
      'X-PP-User-Email': email,
    };
  } catch {
    return null;
  }
}

/**
 * Headers for `/api/profile` and `/api/saved-prompts`.
 * Sends `X-PP-User-*` whenever `pp_user` has id+email (verified on the server
 * with the service role), **and** `Authorization` when the Supabase session is valid.
 * That way if Bearer validation fails on the API but `pp_user` matches Auth, the
 * request still succeeds (needs SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY).
 *
 * Uses one serialized auth resolution (see `resolveAuthUserAndSession`) so parallel
 * callers do not trip the Supabase browser auth-token lock.
 */
export async function getPromptPerfectAuthHeaders(
  supabase: SupabaseClient,
): Promise<Record<string, string> | null> {
  const { user, session } = await resolveAuthUserAndSession(supabase);

  if (user?.id && user.email?.trim()) {
    applyAuthUserToPpUserStorage(user);
  }

  const headers: Record<string, string> = {};
  const pp = readPpUserAuthHeaders();
  if (pp) {
    Object.assign(headers, pp);
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return Object.keys(headers).length > 0 ? headers : null;
}
