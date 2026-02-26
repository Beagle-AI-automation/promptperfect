import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let anonClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

function getUrl(): string | null {
  return (
    process.env.SUPABASE_URL?.trim()?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, '') ??
    null
  );
}

/** Use for server-side API routes. Prefers service_role key (bypasses RLS). */
export function getSupabaseClient(): SupabaseClient | null {
  const url = getUrl();
  if (!url) return null;

  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY?.trim() ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey) {
    if (!serverClient) serverClient = createClient(url, serviceKey);
    return serverClient;
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) return null;
  if (!anonClient) anonClient = createClient(url, anonKey);
  return anonClient;
}
