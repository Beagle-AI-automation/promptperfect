import { normalizeModeForDb } from '@/lib/optimization-logs';
import { getServiceClient } from '@/lib/server/supabase';
import { resolveIdentity } from '@/lib/server/supabaseRequestIdentity';
import { parseFeedbackBody } from '@/lib/apiSchemas';
import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit';
import { logWarn } from '@/lib/logger';

export const runtime = 'nodejs';

function isMissingColumnError(message: string): boolean {
  return /Could not find the '.*' column of 'optimization_logs' in the schema cache/i.test(
    message,
  );
}

export async function POST(req: Request) {
  if (!checkRateLimit(rateLimitKey('feedback', req), 30)) {
    return Response.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 },
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const identity = await resolveIdentity(req);
  const authUserId = identity?.userId ?? null;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = parseFeedbackBody(rawBody);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const {
    mode,
    provider,
    inputLength,
    outputLength,
    feedback,
    sessionId,
  } = parsed.value;

  const sid = sessionId;
  const normalizedMode = normalizeModeForDb(mode);
  const prov = provider || 'gemini';
  const pl = inputLength;
  const ol = outputLength;

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
      if (legacy.error) {
        logWarn('feedback', `legacy insert failed: ${legacy.error.message}`);
        return Response.json({ error: 'Could not save feedback' }, { status: 500 });
      }
      return Response.json({ success: true, legacy: true });
    }
    logWarn('feedback', `update failed: ${updated.error.message}`);
    return Response.json({ error: 'Could not save feedback' }, { status: 500 });
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
      if (legacy.error) {
        logWarn('feedback', `legacy insert(2) failed: ${legacy.error.message}`);
        return Response.json({ error: 'Could not save feedback' }, { status: 500 });
      }
      return Response.json({ success: true, legacy: true });
    }
    logWarn('feedback', `insert failed: ${inserted.error.message}`);
    return Response.json({ error: 'Could not save feedback' }, { status: 500 });
  }

  return Response.json({ success: true, inserted: true });
}
