import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import {
  getDbForIdentity,
  jsonUnauthorizedDetails,
  resolveIdentity,
  wantsPpUserAuth,
} from '@/lib/server/supabaseRequestIdentity';

const ROW_SELECT_FULL =
  'id,session_id,optimize_session_id,prompt_original,prompt_optimized,mode,explanation,created_at';

const ROW_SELECT_LEGACY =
  'id,session_id,prompt_original,prompt_optimized,mode,explanation,created_at';

/** Legacy DB rows may omit `optimize_session_id`; API always exposes it as optional. */
type HistoryListRow = {
  id: string;
  session_id: string;
  optimize_session_id?: string | null;
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  created_at: string;
};

export async function GET(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return NextResponse.json(
      {
        error: 'History API needs the service role key.',
        hint: 'Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY to .env.',
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
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 503 },
    );
  }

  const first = await db
    .from('pp_optimization_history')
    .select(ROW_SELECT_FULL)
    .eq('user_id', identity.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  let data = first.data as HistoryListRow[] | null;
  let error = first.error;

  if (
    error &&
    /optimize_session_id|schema cache|could not find/i.test(error.message)
  ) {
    const second = await db
      .from('pp_optimization_history')
      .select(ROW_SELECT_LEGACY)
      .eq('user_id', identity.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    data = second.data as HistoryListRow[] | null;
    error = second.error;
  }

  if (error) {
    return NextResponse.json(
      { error: error.message, code: 'HISTORY_DB_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data ?? [] });
}

function isMissingColumnError(message: string): boolean {
  return /optimize_session_id|provider|schema cache|could not find|column.*does not exist|PGRST204/i.test(
    message,
  );
}

type HistoryInsertBody = {
  prompt_original?: string;
  prompt_optimized?: string;
  mode?: string;
  explanation?: string;
  session_id?: string;
  optimize_session_id?: string;
  provider?: string;
};

/** Server-side insert when browser PostgREST insert fails (RLS/column mismatch). */
export async function POST(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return NextResponse.json(
      {
        error: 'History API needs the service role key.',
        hint: 'Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY to .env.',
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

  let body: HistoryInsertBody;
  try {
    body = (await request.json()) as HistoryInsertBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const prompt_original = body.prompt_original?.trim() ?? '';
  const prompt_optimized = body.prompt_optimized?.trim() ?? '';
  const mode = body.mode?.trim() ?? 'general';
  const explanation = body.explanation?.trim() ?? '';
  const session_id = body.session_id?.trim() ?? '';

  if (!prompt_original || !prompt_optimized || !session_id) {
    return NextResponse.json(
      { error: 'prompt_original, prompt_optimized, and session_id are required' },
      { status: 400 },
    );
  }

  const db = getDbForIdentity(identity);
  if (!db) {
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 503 },
    );
  }

  const payload: Record<string, unknown> = {
    user_id: identity.userId,
    session_id,
    prompt_original,
    prompt_optimized,
    mode,
    explanation,
  };

  const opt = body.optimize_session_id?.trim();
  if (opt) payload.optimize_session_id = opt;

  const prov = body.provider?.trim();
  if (prov) payload.provider = prov;

  let lastError: { message: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db
      .from('pp_optimization_history')
      .insert(payload)
      .select('id');

    if (!error) {
      const id =
        Array.isArray(data) && data[0] && typeof data[0].id === 'string'
          ? data[0].id
          : null;
      if (id) return NextResponse.json({ id });
      return NextResponse.json(
        { error: 'Insert returned no id', code: 'HISTORY_INSERT_EMPTY' },
        { status: 500 },
      );
    }

    lastError = error;
    if (!isMissingColumnError(error.message)) {
      break;
    }
    if ('optimize_session_id' in payload) {
      delete payload.optimize_session_id;
      continue;
    }
    if ('provider' in payload) {
      delete payload.provider;
      continue;
    }
    break;
  }

  return NextResponse.json(
    {
      error: lastError?.message ?? 'Insert failed',
      code: 'HISTORY_INSERT_ERROR',
    },
    { status: 500 },
  );
}

function isMissingSourceHistoryColumn(message: string): boolean {
  return /source_history_id|could not find.*column.*schema cache|PGRST204/i.test(
    message,
  );
}

/** Remove library rows tied to this history entry, then the history row. */
export async function DELETE(request: Request) {
  if (wantsPpUserAuth(request) && !getSupabaseAdminClient()) {
    return NextResponse.json(
      {
        error: 'History API needs the service role key.',
        hint: 'Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY to .env.',
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

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id || !/^[\da-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const db = getDbForIdentity(identity);
  if (!db) {
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 503 },
    );
  }

  let histQuery = await db
    .from('pp_optimization_history')
    .select(
      'id,user_id,prompt_original,prompt_optimized,optimize_session_id',
    )
    .eq('id', id)
    .maybeSingle();

  if (
    histQuery.error &&
    /optimize_session_id|schema cache|could not find/i.test(
      histQuery.error.message,
    )
  ) {
    histQuery = await db
      .from('pp_optimization_history')
      .select('id,user_id,prompt_original,prompt_optimized')
      .eq('id', id)
      .maybeSingle();
  }

  const { data: hist, error: histErr } = histQuery;

  if (histErr) {
    return NextResponse.json(
      { error: histErr.message, code: 'HISTORY_FETCH_ERROR' },
      { status: 500 },
    );
  }
  if (!hist) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (hist.user_id !== identity.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  /** Drop feedback rows so aggregate thumbs match remaining history (service role; RLS has no anon delete on logs). */
  const admin = getSupabaseAdminClient();
  if (admin) {
    const sessionKeys = new Set<string>([id]);
    const histRow = hist as { optimize_session_id?: string | null };
    const os =
      typeof histRow.optimize_session_id === 'string'
        ? histRow.optimize_session_id.trim()
        : '';
    if (os) sessionKeys.add(os);
    const { error: logDelErr } = await admin
      .from('optimization_logs')
      .delete()
      .in('session_id', [...sessionKeys]);
    if (logDelErr) {
      return NextResponse.json(
        { error: logDelErr.message, code: 'FEEDBACK_LOG_DELETE_ERROR' },
        { status: 500 },
      );
    }
  }

  const delByLink = await db
    .from('pp_saved_prompts')
    .delete()
    .eq('user_id', identity.userId)
    .eq('source_history_id', id);

  if (
    delByLink.error &&
    isMissingSourceHistoryColumn(delByLink.error.message)
  ) {
    const delByContent = await db
      .from('pp_saved_prompts')
      .delete()
      .eq('user_id', identity.userId)
      .eq('original_prompt', hist.prompt_original)
      .eq('optimized_prompt', hist.prompt_optimized);

    if (delByContent.error) {
      return NextResponse.json(
        { error: delByContent.error.message, code: 'LIBRARY_DELETE_ERROR' },
        { status: 500 },
      );
    }
  } else if (delByLink.error) {
    return NextResponse.json(
      { error: delByLink.error.message, code: 'LIBRARY_DELETE_ERROR' },
      { status: 500 },
    );
  }

  const { error: delHistErr } = await db
    .from('pp_optimization_history')
    .delete()
    .eq('id', id)
    .eq('user_id', identity.userId);

  if (delHistErr) {
    return NextResponse.json(
      { error: delHistErr.message, code: 'HISTORY_DELETE_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
