import type { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { session_id?: string; score?: number };
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    const score =
      typeof body.score === 'number' && body.score >= 1 && body.score <= 100
        ? Math.round(body.score)
        : null;

    if (!sessionId || score === null) {
      return Response.json(
        { error: 'session_id and score (1-100) required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { error } = await supabase
      .from('optimization_logs')
      .update({ prompt_score: score })
      .eq('session_id', sessionId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
