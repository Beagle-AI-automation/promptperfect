import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;
let adminCached: SupabaseClient | null = null;

function getSupabaseUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, '') ||
    process.env.SUPABASE_URL?.trim()?.replace(/\/$/, '') ||
    null
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cached) return cached;

  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[PromptPerfect] Supabase is not configured. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
          'in your environment variables. History and Share features will be disabled.'
      );
    }
    return null;
  }

  cached = createClient(url, anonKey);
  return cached;
}

/** Server-only: uses service role key, bypasses RLS. Use for trusted server operations. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (adminCached) return adminCached;

  const url = getSupabaseUrl();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  adminCached = createClient(url, serviceRoleKey);
  return adminCached;
}

