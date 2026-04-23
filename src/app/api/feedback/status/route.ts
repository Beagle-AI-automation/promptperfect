import { getSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

/** Whether optimization_logs already has feedback for this per-run optimize session id. */
export async function GET(request: Request) {
  const sid = new URL(request.url).searchParams.get('session_id')?.trim();
  if (!sid) {
    return Response.json({ submitted: false, feedback: null as string | null });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return Response.json({ submitted: false, feedback: null as string | null });
  }

  const { data, error } = await supabase
    .from('optimization_logs')
    .select('feedback')
    .eq('session_id', sid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return Response.json({ submitted: false, feedback: null as string | null });
  }

  const raw = typeof data.feedback === 'string' ? data.feedback.trim().toLowerCase() : '';
  if (raw === 'up' || raw === 'down') {
    return Response.json({ submitted: true, feedback: raw });
  }

  return Response.json({ submitted: false, feedback: null as string | null });
}
