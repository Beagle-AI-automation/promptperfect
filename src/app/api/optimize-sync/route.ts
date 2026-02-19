import { generateText } from 'ai';
import type { NextRequest } from 'next/server';

import { getModeSystemPrompt } from '@/lib/prompts';
import { splitOptimizedOutput } from '@/lib/delimiter';
import {
  getLanguageModel,
  isRetryableProviderError,
  resolveModelList,
} from '@/lib/providers';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import type { Mode, OptimizeRequest, OptimizeVersion, ProviderId } from '@/lib/types';

function isMode(value: unknown): value is Mode {
  return (
    value === 'developer' ||
    value === 'research' ||
    value === 'beginner' ||
    value === 'product' ||
    value === 'marketing'
  );
}

function isProvider(value: unknown): value is ProviderId {
  return value === 'google';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<OptimizeRequest>;

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const mode: Mode = isMode(body.mode) ? body.mode : 'developer';
    const provider: ProviderId = isProvider(body.provider) ? body.provider : 'google';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
    const modelOverride = typeof body.model === 'string' ? body.model.trim() : undefined;

    if (!apiKey && !process.env.GOOGLE_API_KEY) {
      return Response.json(
        {
          error:
            'Missing GOOGLE_API_KEY. Add it to .env (project root) or paste a BYOK key in the UI.',
        },
        { status: 400 },
      );
    }

    const system = getModeSystemPrompt(mode);
    const models = resolveModelList({ provider, model: modelOverride ?? '', apiKey });

    let lastError: unknown = null;
    for (const modelId of models) {
      try {
        const model = getLanguageModel({ provider, model: modelId, apiKey }, modelId);
        const result = await generateText({
          model,
          system,
          prompt,
        });

        const rawText = result.text ?? '';
        const { optimizedText, explanation, changes } = splitOptimizedOutput(rawText);

        const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
        const version = (body.version === 'v1' || body.version === 'v2' ? body.version : 'v1') as OptimizeVersion;
        if (sessionId) {
          const supabase = getSupabaseAdminClient();
          if (supabase) {
            void supabase.from('optimization_logs').insert({
              session_id: sessionId,
              mode,
              version,
              provider: 'google',
              model: modelId,
              prompt_length: prompt.length,
              optimized_length: optimizedText.length,
              explanation_length: explanation.length + changes.length,
            });
          }
        }

        return Response.json({
          optimizedText,
          explanation,
          changes,
          rawText,
          provider,
          model: modelId,
        });
      } catch (err) {
        lastError = err;
        if (isRetryableProviderError(err)) continue;
        break;
      }
    }

    const message = lastError instanceof Error ? lastError.message : 'Failed to optimize prompt';
    return Response.json({ error: message }, { status: 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }
}

