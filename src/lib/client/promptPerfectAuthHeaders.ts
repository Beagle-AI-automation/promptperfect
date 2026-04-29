'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  persistEnginePrefsFromAuthUser,
  resolveAuthUserAndSession,
} from '@/lib/client/ppUserSync';

/**
 * Headers for `/api/profile` and `/api/saved-prompts`.
 * Sends `Authorization` when the Supabase session is valid, and `X-PP-User-*`
 * from the same verified session user (so the service role can cross-check id+email).
 */
export async function getPromptPerfectAuthHeaders(
  supabase: SupabaseClient,
): Promise<Record<string, string> | null> {
  const { user, session } = await resolveAuthUserAndSession(supabase);

  if (user?.id && user.email?.trim()) {
    persistEnginePrefsFromAuthUser();
  }

  const headers: Record<string, string> = {};
  if (user?.id && user.email?.trim()) {
    headers['X-PP-User-Id'] = user.id;
    headers['X-PP-User-Email'] = user.email.trim();
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return Object.keys(headers).length > 0 ? headers : null;
}
