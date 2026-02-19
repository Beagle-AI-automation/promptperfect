import { getSupabaseClient } from '@/lib/supabase';

/** GET /api/debug - Verify Supabase setup and recent sessions */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const result: Record<string, unknown> = {
    supabaseConfigured: !!(url && (key || serviceKey)),
    urlPresent: !!url,
    anonKeyPresent: !!key,
    serviceRoleKeyPresent: !!serviceKey,
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    return Response.json(result);
  }

  try {
    const { data, error } = await supabase
      .from('optimization_logs')
      .select('id, session_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    result.tableAccessible = !error;
    result.tableError = error?.message ?? null;
    result.recentSessions = data ?? [];
    result.rowCount = data?.length ?? 0;

    // Test insert (then delete) to verify write access
    const testId = `debug-${Date.now()}`;
    const { error: insertError } = await supabase.from('optimization_logs').insert({
      session_id: testId,
      mode: 'better',
      provider: 'gemini',
      model: 'test',
      prompt_length: 0,
    });
    result.insertTest = insertError ? { ok: false, error: insertError.message } : { ok: true };
    if (!insertError) {
      await supabase.from('optimization_logs').delete().eq('session_id', testId);
    }
  } catch (e) {
    result.tableError = e instanceof Error ? e.message : String(e);
  }

  return Response.json(result);
}
