import { generateText } from 'ai';
import type { NextRequest } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/client/supabase';
import { splitOptimizedOutput } from '@/lib/delimiter';
import { normalizeModeForDb, parsePromptScore } from '@/lib/optimization-logs';
import { userFacingOptimizeError } from '@/lib/optimizeUserError';
import { createProvider } from '@/lib/providers';
import { getSystemPrompt } from '@/lib/prompts';
import type { OptimizationMode, OptimizeRequest, Provider } from '@/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MODES: OptimizationMode[] = [
  'better',
  'specific',
  'cot',
  'developer',
  'research',
  'beginner',
  'product',
  'marketing',
];
const PROVIDERS: Provider[] = ['gemini', 'openai', 'anthropic'];

function isMode(v: unknown): v is OptimizationMode {
  return typeof v === 'string' && MODES.includes(v as OptimizationMode);
}

function isProvider(v: unknown): v is Provider {
  return typeof v === 'string' && PROVIDERS.includes(v as Provider);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<OptimizeRequest> & {
      version?: string;
      text?: string;
    };

    const promptRaw =
      typeof body.text === 'string' && body.text.trim()
        ? body.text.trim()
        : typeof body.prompt === 'string'
          ? body.prompt.trim()
          : '';
    if (!promptRaw) {
      return Response.json(
        { error: 'prompt or text is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const mode = isMode(body.mode) ? body.mode : 'better';
    const provider = isProvider(body.provider) ? body.provider : 'gemini';

    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const apiKeyFromBody =
      typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
    const apiKey = bearer || apiKeyFromBody;

    let providerConfig;
    try {
      providerConfig = createProvider(provider, apiKey);
    } catch (e) {
      return Response.json(
        { error: userFacingOptimizeError(e) },
        { status: 400, headers: corsHeaders },
      );
    }

    const { model, modelId } = providerConfig;
    const system = getSystemPrompt(mode);

    try {
      const result = await generateText({
        model,
        system,
        prompt: promptRaw,
        maxRetries: 1,
      });

      const rawText = result.text ?? '';
      const { optimizedText: rawOptimized, explanation, changes } =
        splitOptimizedOutput(rawText);
      const optimizedText = rawOptimized.trim();
      const promptScore = parsePromptScore(rawText);

      const sessionId =
        typeof body.session_id === 'string' ? body.session_id.trim() : '';
      const version =
        body.version === 'v1' || body.version === 'v2' ? body.version : 'v1';

      if (sessionId) {
        const admin = getSupabaseAdminClient();
        const db = admin;
        if (db) {
          void db.from('optimization_logs').insert({
            session_id: sessionId,
            mode: normalizeModeForDb(mode),
            version,
            provider,
            model: modelId,
            prompt_length: promptRaw.length,
            optimized_length: optimizedText.length,
            explanation_length: explanation.length + changes.length,
            ...(promptScore != null ? { prompt_score: promptScore } : {}),
          });
        }
      }

      return Response.json(
        {
          optimizedText,
          explanation,
          changes,
          rawText,
          provider,
          model: modelId,
        },
        { headers: corsHeaders },
      );
    } catch (err) {
      return Response.json(
        { error: userFacingOptimizeError(err) },
        { status: 500, headers: corsHeaders },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
}
