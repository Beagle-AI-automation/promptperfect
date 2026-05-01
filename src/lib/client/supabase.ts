import { createBrowserClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;
let adminCache: { key: string; client: SupabaseClient } | null = null;

/** Trim and strip optional surrounding quotes from .env values (common mis-copy). */
export function normalizeEnvValue(value: string | undefined): string {
  if (!value) return '';
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function getSupabaseUrl(): string | null {
  const raw =
    normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    normalizeEnvValue(process.env.SUPABASE_URL);
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

/**
 * Browser-only client that shares auth storage with login (createBrowserClient).
 * Use for history, logs, and other client-side reads/writes under RLS.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[PromptPerfect] Supabase is not configured. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
          'in your environment variables. History and Share features will be disabled.'
      );
    }
    return null;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (!cached) {
    cached = createBrowserClient(url, anonKey);
  }
  return cached;
}

/** Server-only: uses service role key, bypasses RLS. Use for trusted server operations. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const serviceRoleKey =
    normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    normalizeEnvValue(process.env.SUPABASE_SERVICE_KEY);
  if (!url || !serviceRoleKey) return null;

  if (adminCache?.key === serviceRoleKey) return adminCache.client;

  adminCache = {
    key: serviceRoleKey,
    client: createClient(url, serviceRoleKey),
  };
  return adminCache.client;
}

