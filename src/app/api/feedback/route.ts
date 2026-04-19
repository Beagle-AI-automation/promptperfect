import { normalizeModeForDb } from '@/lib/optimization-logs';
import { getSupabaseClient } from '@/lib/supabase';
import { resolveIdentity } from '@/lib/server/supabaseRequestIdentity';

export const runtime = 'nodejs';

function isMissingColumnError(message: string): boolean {
  return /Could not find the '.*' column of 'optimization_logs' in the schema cache/i.test(
    message,
  );
}

export async function POST(req: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const identity = await resolveIdentity(req);
  const authUserId = identity?.userId ?? null;

  const {
    mode,
    provider,
    inputLength,
    outputLength,
    feedback,
    sessionId,
  } = (await req.json()) as {
    mode?: string;
    provider?: string;
    inputLength?: number;
    outputLength?: number;
    feedback?: string;
    sessionId?: string;
  };

  if (!mode || typeof mode !== 'string') {
    return Response.json({ error: 'mode is required' }, { status: 400 });
  }
  if (!feedback || typeof feedback !== 'string') {
    return Response.json({ error: 'feedback is required' }, { status: 400 });
  }
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    return Response.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const sid = sessionId.trim();
  const normalizedMode = normalizeModeForDb(mode);
  const prov = typeof provider === 'string' && provider.trim() ? provider.trim() : 'gemini';
  const pl = typeof inputLength === 'number' && !Number.isNaN(inputLength) ? inputLength : 0;
  const ol = typeof outputLength === 'number' && !Number.isNaN(outputLength) ? outputLength : 0;

  const baseUpdate = {
    feedback,
    mode: normalizedMode,
    provider: prov,
    model: prov,
    prompt_length: pl,
    optimized_length: ol,
  };
  const updatePayload =
    authUserId ? { ...baseUpdate, user_id: authUserId } : baseUpdate;

  let updated = await supabase
    .from('optimization_logs')
    .update(updatePayload)
    .eq('session_id', sid)
    .select('id');

  if (updated.error && isMissingColumnError(updated.error.message) && authUserId) {
    updated = await supabase
      .from('optimization_logs')
      .update(baseUpdate)
      .eq('session_id', sid)
      .select('id');
  }

  if (updated.error) {
    if (isMissingColumnError(updated.error.message)) {
      const fb = feedback === 'up' ? 'up' : 'down';
      const narrowPayload = authUserId
        ? { feedback: fb, user_id: authUserId }
        : { feedback: fb };
      let narrow = await supabase
        .from('optimization_logs')
        .update(narrowPayload)
        .eq('session_id', sid)
        .select('id');
      if (
        narrow.error &&
        isMissingColumnError(narrow.error.message) &&
        authUserId
      ) {
        narrow = await supabase
          .from('optimization_logs')
          .update({ feedback: fb })
          .eq('session_id', sid)
          .select('id');
      }
      if (!narrow.error && narrow.data && narrow.data.length > 0) {
        return Response.json({ success: true, updated: true });
      }
      const legacyInsert = authUserId
        ? {
            session_id: sid,
            mode: normalizedMode,
            provider: prov,
            model: prov,
            feedback: fb,
            user_id: authUserId,
          }
        : {
            session_id: sid,
            mode: normalizedMode,
            provider: prov,
            model: prov,
            feedback: fb,
          };
      let legacy = await supabase.from('optimization_logs').insert(legacyInsert);
      if (
        legacy.error &&
        isMissingColumnError(legacy.error.message) &&
        authUserId
      ) {
        legacy = await supabase.from('optimization_logs').insert({
          session_id: sid,
          mode: normalizedMode,
          provider: prov,
          model: prov,
          feedback: fb,
        });
      }
      if (legacy.error) return Response.json({ error: legacy.error.message }, { status: 500 });
      return Response.json({ success: true, legacy: true });
    }
    return Response.json({ error: updated.error.message }, { status: 500 });
  }

  if (updated.data && updated.data.length > 0) {
    return Response.json({ success: true, updated: true });
  }

  const insertRow = {
    session_id: sid,
    mode: normalizedMode,
    version: 'v1' as const,
    provider: prov,
    model: prov,
    prompt_length: pl,
    optimized_length: ol,
    explanation_length: 0,
    feedback,
    ...(authUserId ? { user_id: authUserId } : {}),
  };

  let inserted = await supabase.from('optimization_logs').insert(insertRow);

  if (
    inserted.error &&
    isMissingColumnError(inserted.error.message) &&
    authUserId
  ) {
    inserted = await supabase.from('optimization_logs').insert({
      session_id: sid,
      mode: normalizedMode,
      version: 'v1' as const,
      provider: prov,
      model: prov,
      prompt_length: pl,
      optimized_length: ol,
      explanation_length: 0,
      feedback,
    });
  }

  if (inserted.error) {
    if (isMissingColumnError(inserted.error.message)) {
      const fb = feedback === 'up' ? 'up' : 'down';
      let legacy = await supabase.from('optimization_logs').insert({
        session_id: sid,
        mode: normalizedMode,
        provider: prov,
        model: prov,
        feedback: fb,
        ...(authUserId ? { user_id: authUserId } : {}),
      });
      if (
        legacy.error &&
        isMissingColumnError(legacy.error.message) &&
        authUserId
      ) {
        legacy = await supabase.from('optimization_logs').insert({
          session_id: sid,
          mode: normalizedMode,
          provider: prov,
          model: prov,
          feedback: fb,
        });
      }
      if (legacy.error) return Response.json({ error: legacy.error.message }, { status: 500 });
      return Response.json({ success: true, legacy: true });
    }
    return Response.json({ error: inserted.error.message }, { status: 500 });
  }

  return Response.json({ success: true, inserted: true });
}
