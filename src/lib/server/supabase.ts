import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { normalizeEnvValue, normalizeSupabaseUrl } from '@/lib/env';

/**
 * Server-side Supabase factory — single home for every server credential.
 * Browser code must use `@/lib/client/supabaseBrowser` instead (this module
 * pulls in `next/headers`, which cannot ship to the browser).
 */

// Re-exported for server callers that trim raw env values themselves.
export { normalizeEnvValue };

export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) =>
          c.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );
}

export function getSupabaseUrl(): string | null {
  return (
    normalizeSupabaseUrl(process.env.SUPABASE_URL) ??
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );
}

/** Service-role client (bypasses RLS). Use for trusted server operations only. */
export function getServiceClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  if (!url) return null;

  const serviceKey =
    normalizeEnvValue(process.env.SUPABASE_SERVICE_KEY) ||
    normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (serviceKey) return createClient(url, serviceKey);

  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!anonKey) return null;
  return createClient(url, anonKey);
}

/** Server-only: uses service role key, bypasses RLS. Use for trusted server operations. */
let adminCache: { key: string; client: SupabaseClient } | null = null;

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
