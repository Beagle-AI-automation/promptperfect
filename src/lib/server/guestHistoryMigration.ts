import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Attach guest rows to a user and remove guest_usage (service role only).
 */
export async function migrateGuestHistoryAdmin(
  userId: string,
  guestId: string,
): Promise<{ error: string | null }> {
  const trimmed = guestId.trim();
  if (!trimmed) return { error: null };

  const admin = getAdminClient();
  if (!admin) {
    return { error: 'Server is missing Supabase service configuration' };
  }

  const { error: histErr } = await admin
    .from('pp_optimization_history')
    .update({ user_id: userId })
    .eq('session_id', trimmed);

  if (histErr) return { error: histErr.message };

  const { error: guestErr } = await admin
    .from('guest_usage')
    .delete()
    .eq('guest_id', trimmed);

  if (guestErr) return { error: guestErr.message };

  return { error: null };
}
