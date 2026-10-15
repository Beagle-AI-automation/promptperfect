import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeEnvValue, normalizeSupabaseUrl } from '@/lib/env';

/**
 * Browser-only Supabase singleton (shares auth storage with login).
 * Server code must use `@/lib/server/supabase` instead — the admin/service
 * helpers live there and must never ship to the browser.
 */

let cached: SupabaseClient | null = null;

export function getSupabaseUrl(): string | null {
  return (
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    normalizeSupabaseUrl(process.env.SUPABASE_URL)
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[PromptPerfect] Supabase is not configured. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
          'in your environment variables. History and Share features will be disabled.',
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
