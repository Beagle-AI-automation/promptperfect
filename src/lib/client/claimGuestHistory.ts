'use client';

import { clearGuestLocalStorage, getStoredGuestId } from '@/lib/guest';
import { getOrCreateSessionId } from '@/lib/client/optimizationHistory';
import { getSupabaseClient } from '@/lib/client/supabase';

/**
 * Re-parent guest optimizations to the signed-in browser session and optional `user_id`.
 * Clears guest localStorage on success.
 */
export async function claimGuestHistoryAfterAuth(
  userId?: string | null,
): Promise<void> {
  const guestId = getStoredGuestId();
  if (!guestId.startsWith('guest_')) return;
  const targetSessionId = getOrCreateSessionId();
  if (!targetSessionId || guestId === targetSessionId) return;

  const uid = userId?.trim() || undefined;

  try {
    const res = await fetch('/api/auth/claim-guest-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId, targetSessionId, userId: uid }),
    });
    if (res.ok) {
      clearGuestLocalStorage();
      return;
    }
  } catch {
    // try anon fallback below
  }

  const client = getSupabaseClient();
  if (!client) return;

  const patch: { session_id: string; user_id?: string } = {
    session_id: targetSessionId,
  };
  if (uid) patch.user_id = uid;

  const { error } = await client
    .from('pp_optimization_history')
    .update(patch)
    .eq('session_id', guestId);

  if (!error) clearGuestLocalStorage();
}
