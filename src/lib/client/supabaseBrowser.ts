'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '@/lib/localMode';

/**
 * New instance each call so cookie-backed auth state stays in sync with the browser
 * (singletons can leave /profile without a valid session after login).
 */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  // Placeholder URLs (from `.env.example`) count as unconfigured.
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
