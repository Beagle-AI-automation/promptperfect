import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return Response.json({
      total: 0,
      thumbsUp: 0,
      thumbsDown: 0,
      avgScore: null,
      byMode: {},
      byProvider: {},
    });
  }

  try {
    const { data: logs, error } = await supabase
      .from('optimization_logs')
      .select('mode, provider, rating, prompt_score');

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const total = logs?.length ?? 0;
    const thumbsUp = logs?.filter((r) => r.rating === 1).length ?? 0;
    const thumbsDown = logs?.filter((r) => r.rating === -1).length ?? 0;
    const scoresWithValue = (logs ?? []).filter(
      (r) => typeof r.prompt_score === 'number' && r.prompt_score >= 1 && r.prompt_score <= 100,
    );
    const avgScore =
      scoresWithValue.length > 0
        ? Math.round(
            scoresWithValue.reduce((s, r) => s + (r.prompt_score ?? 0), 0) /
              scoresWithValue.length,
          )
        : null;
    const byMode = (logs ?? []).reduce(
      (acc, r) => {
        const m = r.mode ?? 'unknown';
        acc[m] = (acc[m] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const byProvider = (logs ?? []).reduce(
      (acc, r) => {
        const p = r.provider ?? 'unknown';
        acc[p] = (acc[p] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Response.json({
      total,
      thumbsUp,
      thumbsDown,
      avgScore,
      byMode,
      byProvider,
    });
  } catch {
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
