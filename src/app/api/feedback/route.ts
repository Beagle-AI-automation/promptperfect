import type { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { session_id?: string; rating?: string };
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    const rating = body.rating === 'up' || body.rating === 'down' ? body.rating : null;

    if (!sessionId || !rating) {
      return Response.json({ error: 'session_id and rating (up/down) required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('optimization_logs')
      .update({ rating: rating === 'up' ? 1 : -1 })
      .eq('session_id', sessionId)
      .select('id');

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data?.length) {
      const { count } = await supabase
        .from('optimization_logs')
        .select('*', { count: 'exact', head: true });
      const hint =
        count === 0
          ? 'Table is empty — the optimize route may not be inserting. Check server logs for "[optimize] Supabase insert failed".'
          : `Table has ${count} row(s) but none match session_id. The session_id from the client may not be reaching the optimize API.`;
      return Response.json(
        {
          error: 'Session not found.',
          hint,
          debugUrl: '/api/debug',
        },
        { status: 404 },
      );
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
