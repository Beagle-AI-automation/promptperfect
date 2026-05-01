'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  persistEnginePrefsFromAuthUser,
  resolveAuthUserAndSession,
} from '@/lib/client/ppUserSync';

/**
 * Optional headers for same-origin `/api/*` calls.
 * Cookie sessions are sent automatically; `Authorization` is included when present
 * so non-cookie clients (e.g. extension) can still call APIs.
 */
export async function getPromptPerfectAuthHeaders(
  supabase: SupabaseClient,
): Promise<Record<string, string> | null> {
  const { user, session } = await resolveAuthUserAndSession(supabase);

  if (user?.id && user.email?.trim()) {
    persistEnginePrefsFromAuthUser();
  }

  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }

  return null;
}
