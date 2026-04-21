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
 * Only counts feedback for `optimization_logs.session_id` values that still match this
 * user's **current** `pp_optimization_history` rows (`id` and/or `optimize_session_id`).
 * Orphan logs (e.g. after history delete, or user_id-only rows with no history) are excluded
 * so the bar stays aligned with the History list.
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

  let histRows: {
    id: string;
    optimize_session_id?: string | null;
  }[] | null = null;

  const histFull = await admin
    .from('pp_optimization_history')
    .select('id, optimize_session_id')
    .eq('user_id', userId);

  if (!histFull.error && Array.isArray(histFull.data)) {
    histRows = histFull.data as {
      id: string;
      optimize_session_id?: string | null;
    }[];
  } else if (
    histFull.error &&
    /optimize_session_id|schema cache|could not find/i.test(
      histFull.error.message,
    )
  ) {
    const histLegacy = await admin
      .from('pp_optimization_history')
      .select('id')
      .eq('user_id', userId);
    if (!histLegacy.error && Array.isArray(histLegacy.data)) {
      histRows = histLegacy.data as { id: string }[];
    }
  }

  if (!histRows?.length) {
    return empty;
  }

  const allowedSessions = new Set<string>();
  for (const raw of histRows) {
    if (typeof raw.id === 'string' && raw.id.trim()) {
      allowedSessions.add(raw.id.trim());
    }
    if (
      typeof raw.optimize_session_id === 'string' &&
      raw.optimize_session_id.trim()
    ) {
      allowedSessions.add(raw.optimize_session_id.trim());
    }
  }

  if (allowedSessions.size === 0) {
    return empty;
  }

  const ids = [...allowedSessions];
  const qSess = await admin
    .from('optimization_logs')
    .select(
      'session_id, feedback, rating, prompt_score, created_at',
    )
    .in('session_id', ids)
    .order('created_at', { ascending: true });

  const collected: OptimizationLogThumbRow[] =
    !qSess.error && qSess.data?.length
      ? (qSess.data as OptimizationLogThumbRow[])
      : [];

  /** Same rows keyed by session + user (covers edge cases where session-only query lags replication). */
  const qUser = await admin
    .from('optimization_logs')
    .select(
      'session_id, feedback, rating, prompt_score, created_at',
    )
    .eq('user_id', userId)
    .in('session_id', ids)
    .order('created_at', { ascending: true });

  if (!qUser.error && qUser.data?.length) {
    collected.push(...(qUser.data as OptimizationLogThumbRow[]));
  }

  if (collected.length === 0) {
    return empty;
  }

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
