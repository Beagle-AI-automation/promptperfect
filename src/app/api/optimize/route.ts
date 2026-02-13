import { generateText, streamText } from 'ai';
import type { NextRequest } from 'next/server';

import { getModeSystemPrompt } from '@/lib/prompts';
import {
  getLanguageModel,
  isRetryableProviderError,
  resolveModelList,
} from '@/lib/providers';
import type { Mode, OptimizeRequest, ProviderId } from '@/lib/types';

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

async function pickFirstWorkingModel(args: {
  provider: ProviderId;
  apiKey?: string;
  system: string;
  prompt: string;
  modelIds: string[];
}): Promise<string> {
  let lastError: unknown = null;
  for (const modelId of args.modelIds) {
    try {
      const model = getLanguageModel(
        { provider: args.provider, model: modelId, apiKey: args.apiKey },
        modelId,
      );

      // Very small preflight call so we can fall back if a model is missing/quota'd.
      await generateText({
        model,
        system: args.system,
        prompt: args.prompt,
        maxOutputTokens: 8,
      });

      return modelId;
    } catch (err) {
      lastError = err;
      if (isRetryableProviderError(err)) continue;
      break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No model succeeded');
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
    const modelIds = resolveModelList({ provider, model: modelOverride ?? '', apiKey });
    const modelId = await pickFirstWorkingModel({ provider, apiKey, system, prompt, modelIds });
    const model = getLanguageModel({ provider, model: modelId, apiKey }, modelId);

    const result = streamText({
      model,
      system,
      prompt,
    });

    // We stream plain text; the client splits `---EXPLANATION---` live.
    return result.toTextStreamResponse({
      headers: {
        'x-promptperfect-provider': provider,
        'x-promptperfect-model': modelId,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to optimize prompt';
    return Response.json({ error: message }, { status: 500 });
  }
}

