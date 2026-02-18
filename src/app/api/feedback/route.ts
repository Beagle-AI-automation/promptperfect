import type { NextRequest } from 'next/server';

import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/client/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      session_id?: string;
      rating?: string;
      mode?: string;
    };

    const session_id = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    const rating = body.rating === 'up' || body.rating === 'down' ? body.rating : null;
    const mode = typeof body.mode === 'string' ? body.mode : '';

    if (!session_id || !rating) {
      return Response.json(
        { error: 'session_id and rating (up|down) are required' },
        { status: 400 },
      );
    }

    // Prefer service role (bypasses RLS) for reliable server-side updates
    const supabase = getSupabaseAdminClient() ?? getSupabaseClient();
    if (!supabase) {
      return Response.json(
        { error: 'Supabase not configured. Add SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY to .env' },
        { status: 500 },
      );
    }

    const feedback: 'up' | 'down' = rating;

    const { data, error } = await supabase
      .from('optimization_logs')
      .update({ feedback })
      .eq('session_id', session_id)
      .select('id');

    if (error) {
      console.error('[feedback]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data?.length) {
      console.warn('[feedback] No row matched session_id:', session_id);
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return Response.json({ error: message }, { status: 500 });
  }
}
