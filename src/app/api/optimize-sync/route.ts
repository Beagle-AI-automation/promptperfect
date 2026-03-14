import { generateText } from 'ai';
import type { NextRequest } from 'next/server';

import { getSystemPrompt } from '@/lib/prompts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
import { splitOptimizedOutput } from '@/lib/delimiter';
import { createProvider } from '@/lib/providers';

const SCORE_PATTERN = /---SCORE---\d{1,3}---/g;
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import type { OptimizationMode, OptimizeRequest, Provider } from '@/lib/types';

const MODES: OptimizationMode[] = ['better', 'specific', 'cot', 'developer', 'research', 'beginner', 'product', 'marketing'];
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
    const body = (await req.json()) as Partial<OptimizeRequest> & { version?: string };

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400, headers: corsHeaders });
    }

    const mode = isMode(body.mode) ? body.mode : 'better';
    const provider = isProvider(body.provider) ? body.provider : 'gemini';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;

    let providerConfig;
    try {
      providerConfig = createProvider(provider, apiKey);
    } catch (e) {
      return Response.json(
        { error: (e as Error).message },
        { status: 400, headers: corsHeaders }
      );
    }

    const { model, modelId } = providerConfig;
    const system = getSystemPrompt(mode);

    try {
      const result = await generateText({
        model,
        system,
        prompt,
      });

      const rawText = result.text ?? '';
      const { optimizedText: rawOptimized, explanation, changes } = splitOptimizedOutput(rawText);
      const optimizedText = rawOptimized.replace(SCORE_PATTERN, '').trim();

      const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
      const version = body.version === 'v1' || body.version === 'v2' ? body.version : 'v1';

      if (sessionId) {
        const supabase = getSupabaseAdminClient();
        if (supabase) {
          void supabase.from('optimization_logs').insert({
            session_id: sessionId,
            mode,
            version,
            provider,
            model: modelId,
            prompt_length: prompt.length,
            optimized_length: optimizedText.length,
            explanation_length: explanation.length + changes.length,
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
        { headers: corsHeaders }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to optimize prompt';
      return Response.json({ error: message }, { status: 500, headers: corsHeaders });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
}
