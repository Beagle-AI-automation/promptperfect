import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/client/supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  optimization_count: number;
  favorite_mode: string | null;
  created_at: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('pp_user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

/** Create or fetch profile row (e.g. legacy users if trigger did not run). */
export async function ensureUserProfile(user: User): Promise<UserProfile | null> {
  const existing = await getUserProfile(user.id);
  if (existing) return existing;

  const client = getSupabaseClient();
  if (!client) return null;

  const meta = user.user_metadata ?? {};
  const display_name =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (user.email ? user.email.split('@')[0] : 'User');

  const avatar_url =
    typeof meta.avatar_url === 'string' && meta.avatar_url.trim()
      ? meta.avatar_url.trim()
      : null;

  const { data, error } = await client
    .from('pp_user_profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        display_name,
        avatar_url,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string | null },
): Promise<{ error: Error | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase is not configured') };

  const { error } = await client
    .from('pp_user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return { error: error ? new Error(error.message) : null };
}

/**
 * Attach guest optimization rows to the signed-in user and clear server guest_usage.
 * Requires a valid Supabase session (OAuth / email). guest_usage is service-role only.
 */
export async function migrateGuestHistory(
  supabase: SupabaseClient,
  guestId: string,
): Promise<{ error: Error | null }> {
  const trimmed = guestId.trim();
  if (!trimmed) return { error: null };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: new Error('No session') };
  }

  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  if (!origin) return { error: new Error('Missing origin') };

  const res = await fetch(`${origin}/api/migrate-guest-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ guestId: trimmed }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      error: new Error(body.error?.trim() || `Migration failed (${res.status})`),
    };
  }

  return { error: null };
}

export async function getUserStats(userId: string): Promise<{
  total: number;
  favoriteMode: string | null;
  favoriteProvider: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { total: 0, favoriteMode: null, favoriteProvider: null };
  }

  const { data: optimizations, error } = await client
    .from('pp_optimization_history')
    .select('mode, provider, created_at')
    .eq('user_id', userId);

  if (error || !optimizations?.length) {
    return { total: 0, favoriteMode: null, favoriteProvider: null };
  }

  const modeCounts: Record<string, number> = {};
  const providerCounts: Record<string, number> = {};

  for (const opt of optimizations) {
    const mode = typeof opt.mode === 'string' ? opt.mode : '';
    if (mode) modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    if (typeof opt.provider === 'string' && opt.provider) {
      providerCounts[opt.provider] = (providerCounts[opt.provider] || 0) + 1;
    }
  }

  const favoriteMode =
    Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favoriteProvider =
    Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    total: optimizations.length,
    favoriteMode,
    favoriteProvider,
  };
}
