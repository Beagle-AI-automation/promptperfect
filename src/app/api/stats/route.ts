import { getSupabaseAdminClient } from '@/lib/server/supabase';
import { computeOptimizationFeedbackAnalytics } from '@/lib/server/optimizationLogStats';
import { resolveIdentity } from '@/lib/server/supabaseRequestIdentity';
import { logWarn } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/auth/rateLimit';

/**
 * Aggregates across history and feedback tables, so each call is one of the
 * heavier reads in the API. 60/min is plenty for a dashboard that loads once
 * and polls occasionally.
 */
const STATS_RATE_LIMIT = 60;

/**
 * Analytics for the signed-in user only (cookie session or Bearer via `resolveIdentity`).
 * Volume/mode/provider from `pp_optimization_history`; thumbs from `optimization_logs`
 * whose `session_id` still matches a row in that history (`id` or `optimize_session_id`).
 */
export async function GET(request: Request) {
  // Before `resolveIdentity`, so an unauthenticated flood is stopped without
  // paying for JWT verification on every request.
  const limited = enforceRateLimit('stats', request, STATS_RATE_LIMIT);
  if (limited) return limited;

  const identity = await resolveIdentity(request);
  const supabase = getSupabaseAdminClient();

  const empty = {
    total: 0,
    thumbsUp: 0,
    thumbsDown: 0,
    avgScore: null as number | null,
    byMode: {} as Record<string, number>,
    byProvider: {} as Record<string, number>,
  };

  /** Lets the client distinguish “not signed in yet / no identity” from a real account with zero activity. */
  if (!supabase || !identity?.userId) {
    return Response.json({ ...empty, authenticated: false });
  }

  try {
    type HistAggRow = { mode?: string | null; provider?: string | null };

    const { data: hist, error } = await supabase
      .from('pp_optimization_history')
      .select('mode, provider, optimize_session_id')
      .eq('user_id', identity.userId);

    if (error) {
      const fallback =
        /optimize_session_id|schema cache|could not find/i.test(error.message);
      if (!fallback) {
        logWarn('stats', `history aggregate failed: ${error.message}`);
        return Response.json({ error: 'Could not load stats' }, { status: 500 });
      }
      const { data: hist2, error: err2 } = await supabase
        .from('pp_optimization_history')
        .select('mode, provider')
        .eq('user_id', identity.userId);
      if (err2) {
        logWarn('stats', `history fallback failed: ${err2.message}`);
        return Response.json({ error: 'Could not load stats' }, { status: 500 });
      }
      const rows = hist2 ?? [];
      const total = rows.length;
      const byMode = rows.reduce(
        (acc: Record<string, number>, r: HistAggRow) => {
          const m = (r.mode ?? 'unknown').trim() || 'unknown';
          acc[m] = (acc[m] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      const byProvider = rows.reduce(
        (acc: Record<string, number>, r: HistAggRow) => {
          const p = (r.provider ?? 'unknown').trim() || 'unknown';
          acc[p] = (acc[p] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const fb = await computeOptimizationFeedbackAnalytics(
        supabase,
        identity.userId,
      );

      return Response.json({
        total,
        thumbsUp: fb.thumbsUp,
        thumbsDown: fb.thumbsDown,
        avgScore: fb.avgScore,
        byMode,
        byProvider,
        authenticated: true,
      });
    }

    const rows = hist ?? [];
    const total = rows.length;

    const byMode = rows.reduce(
      (acc: Record<string, number>, r: HistAggRow) => {
        const m = (r.mode ?? 'unknown').trim() || 'unknown';
        acc[m] = (acc[m] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byProvider = rows.reduce(
      (acc: Record<string, number>, r: HistAggRow) => {
        const p = (r.provider ?? 'unknown').trim() || 'unknown';
        acc[p] = (acc[p] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const fb = await computeOptimizationFeedbackAnalytics(
      supabase,
      identity.userId,
    );

    return Response.json({
      total,
      thumbsUp: fb.thumbsUp,
      thumbsDown: fb.thumbsDown,
      avgScore: fb.avgScore,
      byMode,
      byProvider,
      authenticated: true,
    });
  } catch (err) {
    logWarn(
      'stats',
      `request failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
