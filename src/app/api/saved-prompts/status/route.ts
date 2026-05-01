import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import {
  getDbForIdentity,
  jsonUnauthorizedDetails,
  resolveIdentity,
  wantsPpUserAuth,
} from '@/lib/server/supabaseRequestIdentity';

/** PostgREST rejects filters on unknown columns until migration adds them. */
function isSourceHistoryColumnUnavailable(message: string): boolean {
  return /source_history_id|could not find.*column|schema cache|PGRST204/i.test(
    message,
  );
}

export async function GET(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return NextResponse.json(
      {
        error: 'Saved prompts API needs the service role key.',
        code: 'SERVICE_KEY_REQUIRED',
      },
      { status: 503 },
    );
  }

  const identity = await resolveIdentity(request);
  if (!identity) {
    return NextResponse.json(await jsonUnauthorizedDetails(request), {
      status: 401,
    });
  }

  const db = getDbForIdentity(identity);
  if (!db) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const historyId = new URL(request.url).searchParams.get('history_id')?.trim();
  if (!historyId || !/^[\da-f-]{36}$/i.test(historyId)) {
    return NextResponse.json({ saved: false });
  }

  const primary = await db
    .from('pp_saved_prompts')
    .select('id')
    .eq('user_id', identity.userId)
    .eq('source_history_id', historyId)
    .maybeSingle();

  if (!primary.error) {
    return NextResponse.json({ saved: !!primary.data });
  }

  if (!isSourceHistoryColumnUnavailable(primary.error.message)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[saved-prompts/status]', primary.error.message);
    }
    return NextResponse.json({ saved: false });
  }

  const { data: hist, error: histErr } = await db
    .from('pp_optimization_history')
    .select('prompt_original, prompt_optimized')
    .eq('id', historyId)
    .eq('user_id', identity.userId)
    .maybeSingle();

  if (histErr || !hist) {
    return NextResponse.json({ saved: false });
  }

  const { data: match, error: matchErr } = await db
    .from('pp_saved_prompts')
    .select('id')
    .eq('user_id', identity.userId)
    .eq('original_prompt', hist.prompt_original)
    .eq('optimized_prompt', hist.prompt_optimized)
    .maybeSingle();

  if (matchErr) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[saved-prompts/status] fallback', matchErr.message);
    }
    return NextResponse.json({ saved: false });
  }

  return NextResponse.json({ saved: !!match });
}
