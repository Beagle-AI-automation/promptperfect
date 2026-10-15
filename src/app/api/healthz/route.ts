import { getSupabaseAdminClient } from '@/lib/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness/readiness probe for orchestrators and the Docker HEALTHCHECK.
 * Unauthenticated by design; exposes only non-sensitive signals — never
 * credentials or env names. `db` is a boolean readiness hint (whether the
 * service-role client is configured), not a live connectivity check.
 */
export async function GET(): Promise<Response> {
  return Response.json({
    status: 'ok',
    db: Boolean(getSupabaseAdminClient()),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
