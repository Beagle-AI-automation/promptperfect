import { streamText } from 'ai';
import type { NextRequest } from 'next/server';
import { getSystemPrompt } from '@/lib/prompts';
import { createProvider } from '@/lib/providers';
import type { OptimizeRequest, OptimizationMode, Provider } from '@/lib/types';

const MODES: OptimizationMode[] = ['better', 'specific', 'cot'];
const PROVIDERS: Provider[] = ['gemini', 'openai', 'anthropic'];

function isMode(v: unknown): v is OptimizationMode {
  return typeof v === 'string' && MODES.includes(v as OptimizationMode);
}

function isProvider(v: unknown): v is Provider {
  return typeof v === 'string' && PROVIDERS.includes(v as Provider);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<OptimizeRequest>;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const mode = isMode(body.mode) ? body.mode : 'better';
    const provider = isProvider(body.provider) ? body.provider : 'gemini';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;

    if (provider !== 'gemini' && !apiKey) {
      return Response.json(
        { error: `${provider} requires an API key. Add it in settings.` },
        { status: 401 },
      );
    }

    const { model } = createProvider(provider, apiKey);
    const system = getSystemPrompt(mode);

    const sessionId =
      (typeof body.session_id === 'string' ? body.session_id.trim() : '') ||
      crypto.randomUUID();

    if (process.env.NODE_ENV === 'development') {
      console.log('[optimize] session_id from body:', body.session_id ? 'yes' : 'MISSING', '→ using:', sessionId.slice(0, 8) + '…');
    }

    const result = streamText({
      model,
      system,
      prompt,
    });

    const response = result.toTextStreamResponse({
      headers: {
        'X-PromptPerfect-Session-Id': sessionId,
      },
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to optimize';
    return Response.json({ error: msg }, { status: 500 });
  }
}
