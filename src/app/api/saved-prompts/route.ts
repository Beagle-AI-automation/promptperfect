import { NextResponse } from 'next/server';
import {
  getDbForIdentity,
  jsonUnauthorizedDetails,
  resolveIdentity,
} from '@/lib/server/supabaseRequestIdentity';
import { nextOffset, parseLimit, parseOffset } from '@/lib/pagination';
import { logWarn } from '@/lib/logger';

const MAX_TITLE = 200;
const MAX_TEXT = 100_000;

function isMissingSourceHistoryColumn(message: string): boolean {
  return /source_history_id|could not find.*column.*schema cache|PGRST204/i.test(
    message,
  );
}

export async function GET(request: Request) {
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

  const params = new URL(request.url).searchParams;
  const limit = parseLimit(params.get('limit'), 100);
  const offset = parseOffset(params.get('offset'));

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    db
      .from('pp_saved_prompts')
      .select(
        'id,title,original_prompt,optimized_prompt,explanation,mode,provider,created_at',
      )
      .eq('user_id', identity.userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1),
    db
      .from('pp_saved_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', identity.userId),
  ]);
  const total = typeof count === 'number' ? count : (data?.length ?? 0) + offset;

  if (error || countError) {
    const message = error?.message ?? countError?.message ?? '';
    const missing =
      /does not exist|could not find|schema cache|42P01/i.test(message);
    if (!missing) {
      logWarn('saved-prompts', `GET failed: ${message}`);
    }
    return NextResponse.json(
      {
        error: missing
          ? 'Database table pp_saved_prompts is missing.'
          : 'Could not load prompts',
        hint: missing
          ? 'Run supabase/migrations/20250406120000_pp_saved_prompts.sql in the Supabase SQL editor.'
          : undefined,
        code: 'LIBRARY_DB_ERROR',
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({
    prompts: data ?? [],
    nextOffset: nextOffset(offset, limit, total),
    total,
  });
}

export async function POST(request: Request) {
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
  const APP_MODES = [
    'better',
    'specific',
    'cot',
    'developer',
    'research',
    'beginner',
    'product',
    'marketing',
    'production',
  ];
  const mode = APP_MODES.includes(modeRaw) ? modeRaw : 'better';
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
    logWarn('saved-prompts', `POST failed: ${lastError.message}`);
    return NextResponse.json(
      {
        error: fk
          ? 'Your account must match Supabase Auth. Log out and log in again.'
          : 'Could not save prompt',
        hint: fk
          ? 'Your account must match Supabase Auth. Log out and log in again.'
          : undefined,
        code: fk ? 'LIBRARY_FK_AUTH' : 'LIBRARY_INSERT_FAILED',
      },
      { status: fk ? 400 : 500 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: 'Prompt was saved but could not be retrieved.', code: 'LIBRARY_ROW_MISSING' },
      { status: 500 },
    );
  }

  return NextResponse.json({ prompt: row });
}

export async function DELETE(request: Request) {
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
    logWarn('saved-prompts', `DELETE lookup failed: ${selErr.message}`);
    return NextResponse.json({ error: 'Could not delete prompt' }, { status: 500 });
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
    logWarn('saved-prompts', `DELETE failed: ${error.message}`);
    return NextResponse.json({ error: 'Could not delete prompt' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
