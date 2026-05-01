'use client';

import { clearGuestLocalStorage, getStoredGuestId } from '@/lib/guest';
import { getOrCreateSessionId } from '@/lib/client/optimizationHistory';
import { getSupabaseClient } from '@/lib/client/supabase';

/**
 * Re-parent guest optimizations to the signed-in browser session and `user_id` from the session cookie.
 * Clears guest localStorage on success.
 */
export async function claimGuestHistoryAfterAuth(): Promise<void> {
  const guestId = getStoredGuestId();
  if (!guestId.startsWith('guest_')) return;
  const targetSessionId = getOrCreateSessionId();
  if (!targetSessionId || guestId === targetSessionId) return;

  try {
    const res = await fetch('/api/auth/claim-guest-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ guestId, targetSessionId }),
    });
    if (res.ok) {
      clearGuestLocalStorage();
      return;
    }
  } catch {
    // swallow: authenticated claim path failed — try anon fallback below
  }

  const client = getSupabaseClient();
  if (!client) return;

  const {
    data: { user },
  } = await client.auth.getUser();
  const patch: { session_id: string; user_id?: string } = {
    session_id: targetSessionId,
  };
  if (user?.id) patch.user_id = user.id;

  const { error } = await client
    .from('pp_optimization_history')
    .update(patch)
    .eq('session_id', guestId);

  if (!error) clearGuestLocalStorage();
}
