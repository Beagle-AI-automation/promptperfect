import { streamText } from 'ai';

import { splitOptimizedOutput } from '@/lib/delimiter';
import { normalizeModeForDb, parsePromptScore } from '@/lib/optimization-logs';
import { userFacingOptimizeError } from '@/lib/optimizeUserError';
import { createProvider } from '@/lib/providers';
import { getSystemPrompt } from '@/lib/prompts';
import { parseOptimizeBody } from '@/lib/apiSchemas';
import { getServiceClient } from '@/lib/server/supabase';
import { getRequestId, logApi, logWarn } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/auth/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Public streaming endpoint. Without a BYOK key it falls back to the server's
 * own provider key, so an unauthenticated caller can otherwise burn the
 * project's LLM quota one request at a time. Throttle per IP before any
 * provider work happens.
 */
const OPTIMIZE_RATE_LIMIT = 20;

export async function POST(request: Request) {
  const started = Date.now();
  const requestId = getRequestId(request);
  const res = await handlePost(request);
  // For streams this measures time-to-first-byte, not full completion.
  logApi('optimize', {
    status: res.status,
    ms: Date.now() - started,
    requestId,
  });
  return res;
}

async function handlePost(request: Request) {
  const limited = enforceRateLimit('optimize', request, OPTIMIZE_RATE_LIMIT);
  if (limited) return limited;

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const parsed = parseOptimizeBody(rawBody);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    const {
      prompt: promptRaw,
      mode: modeStr,
      apiKey,
      sessionId,
    } = parsed.value;
    const dbMode = normalizeModeForDb(modeStr);

    let model;
    let modelId: string;
    try {
      const resolved = createProvider(
        'gemini',
        typeof apiKey === 'string' ? apiKey : undefined,
      );
      model = resolved.model;
      modelId = resolved.modelId;
    } catch (e) {
      return Response.json(
        { error: userFacingOptimizeError(e) },
        { status: 400 },
      );
    }

    const systemPrompt = getSystemPrompt(modeStr);

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: promptRaw,
      maxRetries: 1,
      onFinish: async ({ text }) => {
        try {
          const { optimizedText: rawOpt, explanation, changes } =
            splitOptimizedOutput(text);
          const optimizedText = rawOpt.trim();
          const promptScore = parsePromptScore(text);

          if (sessionId) {
            const supabase = getServiceClient();
            if (supabase) {
              void supabase.from('optimization_logs').insert({
                session_id: sessionId,
                mode: dbMode,
                version: 'v1',
                provider: 'gemini',
                model: modelId,
                prompt_length: promptRaw.length,
                optimized_length: optimizedText.length,
                explanation_length: explanation.length + changes.length,
                ...(promptScore != null ? { prompt_score: promptScore } : {}),
              });
            }
          }
        } catch (logErr) {
          logWarn(
            'optimize',
            `onFinish logging error: ${logErr instanceof Error ? logErr.message : String(logErr)}`,
          );
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    logWarn(
      'optimize',
      `request failed: ${err instanceof Error ? err.message : 'Invalid request'}`,
    );
    return Response.json(
      { error: userFacingOptimizeError(err) },
      { status: 500 },
    );
  }
}
