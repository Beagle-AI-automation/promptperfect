import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import {
  getDbForIdentity,
  jsonUnauthorizedDetails,
  resolveIdentity,
  wantsPpUserAuth,
} from '@/lib/server/supabaseRequestIdentity';

const MAX_TITLE = 200;
const MAX_TEXT = 100_000;

function isMissingSourceHistoryColumn(message: string): boolean {
  return /source_history_id|could not find.*column.*schema cache|PGRST204/i.test(
    message,
  );
}

function serviceKeyRequiredResponse() {
  return NextResponse.json(
    {
      error: 'Saved prompts API needs the service role key.',
      hint: 'Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY to .env (same project as NEXT_PUBLIC_SUPABASE_URL). Restart the dev server.',
      code: 'SERVICE_KEY_REQUIRED',
    },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return serviceKeyRequiredResponse();
  }

  const identity = await resolveIdentity(request);
  if (!identity) {
    return NextResponse.json(await jsonUnauthorizedDetails(request), {
      status: 401,
    });
  }

  const db = getDbForIdentity(identity);
  if (!db) {
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 503 },
    );
  }

  const { data, error } = await db
    .from('pp_saved_prompts')
    .select(
      'id,title,original_prompt,optimized_prompt,explanation,mode,provider,created_at',
    )
    .eq('user_id', identity.userId)
    .order('created_at', { ascending: false });

  if (error) {
    const missing =
      /does not exist|could not find|schema cache|42P01/i.test(error.message);
    return NextResponse.json(
      {
        error: missing
          ? 'Database table pp_saved_prompts is missing.'
          : error.message,
        hint: missing
          ? 'Run supabase/migrations/20250406120000_pp_saved_prompts.sql in the Supabase SQL editor.'
          : undefined,
        code: 'LIBRARY_DB_ERROR',
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ prompts: data ?? [] });
}

export async function POST(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return serviceKeyRequiredResponse();
  }

  const identity = await resolveIdentity(request);
  if (!identity) {
    return NextResponse.json(await jsonUnauthorizedDetails(request), {
      status: 401,
    });
  }

  const db = getDbForIdentity(identity);
  if (!db) {
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const title =
    typeof body?.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
  const original_prompt =
    typeof body?.original_prompt === 'string'
      ? body.original_prompt.slice(0, MAX_TEXT)
      : '';
  const optimized_prompt =
    typeof body?.optimized_prompt === 'string'
      ? body.optimized_prompt.slice(0, MAX_TEXT)
      : '';
  const explanation =
    typeof body?.explanation === 'string'
      ? body.explanation.slice(0, MAX_TEXT)
      : '';
  const modeRaw = typeof body?.mode === 'string' ? body.mode.toLowerCase() : '';
  const mode =
    modeRaw === 'better' || modeRaw === 'specific' || modeRaw === 'cot'
      ? modeRaw
      : 'better';
  const provider =
    typeof body?.provider === 'string' && body.provider.trim()
      ? body.provider.trim().slice(0, 64)
      : 'gemini';

  const history_id =
    typeof body?.history_id === 'string' ? body.history_id.trim() : '';
  const source_history_id =
    /^[\da-f-]{36}$/i.test(history_id) ? history_id : undefined;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (!original_prompt.trim()) {
    return NextResponse.json(
      { error: 'original_prompt is required' },
      { status: 400 },
    );
  }

  const insertPayload: Record<string, unknown> = {
    user_id: identity.userId,
    title,
    original_prompt: original_prompt.trim(),
    optimized_prompt: optimized_prompt.trim(),
    explanation: explanation.trim(),
    mode,
    provider,
    updated_at: new Date().toISOString(),
  };
  if (source_history_id) insertPayload.source_history_id = source_history_id;

  const selectSaved =
    'id,title,original_prompt,optimized_prompt,explanation,mode,provider,created_at';

  let payload: Record<string, unknown> = { ...insertPayload };
  let row: {
    id: string;
    title: string;
    original_prompt: string;
    optimized_prompt: string;
    explanation: string;
    mode: string;
    provider: string;
    created_at: string;
  } | null = null;
  let lastError: { message: string } | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await db
      .from('pp_saved_prompts')
      .insert(payload)
      .select(selectSaved)
      .maybeSingle();

    if (!error && data) {
      row = data;
      break;
    }
    if (error) lastError = error;
    if (
      error &&
      isMissingSourceHistoryColumn(error.message) &&
      'source_history_id' in payload
    ) {
      const rest = { ...payload };
      delete rest.source_history_id;
      payload = rest;
      continue;
    }
    break;
  }

  if (!row && lastError) {
    const fk = /pp_saved_prompts_user_id_fkey|foreign key/i.test(lastError.message);
    return NextResponse.json(
      {
        error: lastError.message,
        hint: fk
          ? 'Your account must match Supabase Auth. Log out and log in again.'
          : undefined,
        code: fk ? 'LIBRARY_FK_AUTH' : 'LIBRARY_INSERT_FAILED',
      },
      { status: fk ? 400 : 500 },
    );
  }

  return NextResponse.json({ prompt: row });
}

export async function DELETE(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return serviceKeyRequiredResponse();
  }

  const identity = await resolveIdentity(request);
  if (!identity) {
    return NextResponse.json(await jsonUnauthorizedDetails(request), {
      status: 401,
    });
  }

  const db = getDbForIdentity(identity);
  if (!db) {
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 503 },
    );
  }

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id || !/^[\da-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const { data: existing, error: selErr } = await db
    .from('pp_saved_prompts')
    .select('id')
    .eq('id', id)
    .eq('user_id', identity.userId)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await db
    .from('pp_saved_prompts')
    .delete()
    .eq('id', id)
    .eq('user_id', identity.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
