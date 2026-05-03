'use client';

import { clearGuestLocalStorage, getStoredGuestId } from '@/lib/guest';
import {
  getLocalHistoryForSession,
  getOrCreateSessionId,
} from '@/lib/client/optimizationHistory';
import { getSupabaseClient } from '@/lib/client/supabase';

/**
 * Re-parent guest optimizations to the signed-in account after authentication.
 *
 * Two strategies run in parallel so all guest data is captured regardless of
 * whether it was persisted to Supabase or only survived in localStorage:
 *
 * 1. Server-side DB claim — updates `pp_optimization_history` rows whose
 *    `session_id` matches the guest id (handles rows that did reach Supabase).
 *
 * 2. localStorage claim — reads rows that never reached Supabase (common when
 *    RLS blocks anonymous inserts) and POSTs each one to `/api/history` with
 *    the user's auth session so they are properly linked to the account.
 */
export async function claimGuestHistoryAfterAuth(): Promise<void> {
  const guestId = getStoredGuestId();
  if (!guestId) return;
  const targetSessionId = getOrCreateSessionId();
  if (!targetSessionId || guestId === targetSessionId) return;

  // ── 1. Server-side DB claim ──────────────────────────────────────────────
  try {
    await fetch('/api/auth/claim-guest-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ guestId, targetSessionId }),
    });
  } catch {
    // swallow — localStorage claim below is the reliable fallback
  }

  // ── 2. localStorage claim ────────────────────────────────────────────────
  // Guest history rows saved while Supabase was unavailable (or RLS blocked
  // the anon insert) live here, keyed by the guest's session id.
  const localRows = getLocalHistoryForSession(guestId);
  if (localRows.length > 0) {
    await Promise.allSettled(
      localRows.map((row) =>
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            prompt_original: row.prompt_original,
            prompt_optimized: row.prompt_optimized,
            mode: row.mode,
            explanation: row.explanation,
            session_id: targetSessionId,
          }),
        }).catch(() => null),
      ),
    );
  }

  // ── 3. Anon Supabase fallback (for environments without cookie auth) ─────
  const client = getSupabaseClient();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user?.id) {
      await client
        .from('pp_optimization_history')
        .update({ session_id: targetSessionId, user_id: user.id })
        .eq('session_id', guestId)
        .then(() => null)
        .catch(() => null);
    }
  }

  clearGuestLocalStorage();
}
