import type { SupabaseClient } from '@supabase/supabase-js';

export type OptimizationLogThumbRow = {
  session_id: string;
  feedback?: string | null;
  rating?: string | number | null;
  prompt_score?: number | null;
  created_at?: string;
};

export function normalizeThumb(row: {
  feedback?: string | null;
  rating?: string | number | null;
}): 'up' | 'down' | null {
  const f =
    typeof row.feedback === 'string' ? row.feedback.trim().toLowerCase() : '';
  if (
    f === 'up' ||
    f === 'positive' ||
    f === 'like' ||
    f === '👍' ||
    f === 'good'
  )
    return 'up';
  if (
    f === 'down' ||
    f === 'negative' ||
    f === 'dislike' ||
    f === '👎' ||
    f === 'bad'
  )
    return 'down';
  const r = row.rating;
  if (r === 1 || r === '1') return 'up';
  if (r === -1 || r === '-1') return 'down';
  return null;
}

/** Latest row per session_id wins (by created_at). */
function mergeLogsBySession(
  rows: OptimizationLogThumbRow[],
): Map<string, OptimizationLogThumbRow> {
  const merged = new Map<string, OptimizationLogThumbRow>();
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.created_at ?? 0).getTime() -
      new Date(b.created_at ?? 0).getTime(),
  );
  for (const row of sorted) {
    const sid = typeof row.session_id === 'string' ? row.session_id.trim() : '';
    if (!sid) continue;
    merged.set(sid, row);
  }
  return merged;
}

/**
 * Thumbs + optional average prompt score for analytics (no extra DB columns).
 * Joins `optimization_logs.session_id` to `pp_optimization_history.optimize_session_id`
 * for this user — same per-run id as `/api/optimize` and `saveToHistory`.
 */
export async function computeOptimizationFeedbackAnalytics(
  admin: SupabaseClient,
  userId: string,
): Promise<{
  thumbsUp: number;
  thumbsDown: number;
  avgScore: number | null;
}> {
  const empty = { thumbsUp: 0, thumbsDown: 0, avgScore: null as number | null };

  const collected: OptimizationLogThumbRow[] = [];

  /** Logs recorded with signed-in user (preferred; works even without history.optimize_session_id). */
  const byUser = await admin
    .from('optimization_logs')
    .select(
      'session_id, feedback, rating, prompt_score, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (
    !byUser.error &&
    Array.isArray(byUser.data) &&
    byUser.data.length > 0
  ) {
    collected.push(...(byUser.data as OptimizationLogThumbRow[]));
  }

  /** Legacy link: session_id matches pp_optimization_history.optimize_session_id. */
  const histRes = await admin
    .from('pp_optimization_history')
    .select('optimize_session_id')
    .eq('user_id', userId);

  let sessionIds: string[] = [];
  if (!histRes.error && histRes.data?.length) {
    const rows = histRes.data as {
      optimize_session_id?: string | null;
    }[];
    const ids = rows
      .map((r) =>
        typeof r.optimize_session_id === 'string'
          ? r.optimize_session_id.trim()
          : '',
      )
      .filter((id) => id.length > 0);
    sessionIds = [...new Set(ids)];
  }

  if (sessionIds.length > 0) {
    const qSess = await admin
      .from('optimization_logs')
      .select(
        'session_id, feedback, rating, prompt_score, created_at',
      )
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    if (!qSess.error && qSess.data?.length) {
      collected.push(...(qSess.data as OptimizationLogThumbRow[]));
    }
  }

  if (collected.length === 0) return empty;

  const merged = mergeLogsBySession(collected);
  let thumbsUp = 0;
  let thumbsDown = 0;
  const scores: number[] = [];

  for (const row of merged.values()) {
    const dir = normalizeThumb(row);
    if (dir === 'up') thumbsUp++;
    else if (dir === 'down') thumbsDown++;
    if (
      typeof row.prompt_score === 'number' &&
      !Number.isNaN(row.prompt_score)
    ) {
      scores.push(row.prompt_score);
    }
  }

  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  return { thumbsUp, thumbsDown, avgScore };
}
