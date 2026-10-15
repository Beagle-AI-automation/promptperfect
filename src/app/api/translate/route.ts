import { generateText } from 'ai';
import { NextResponse } from 'next/server';

import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit';
import { createRouteHandlerClient } from '@/lib/server/supabase';
import { createProvider, hasServerKey } from '@/lib/providers';
import { isUnlimitedMode } from '@/lib/localMode';
import { getRequestId, logApi } from '@/lib/logger';
import { parseTranslateBody } from '@/lib/apiSchemas';
import { buildTranslatorPrompt } from '@/lib/translation';
import { userFacingOptimizeError } from '@/lib/optimizeUserError';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const started = Date.now();
  const requestId = getRequestId(request);
  const res = await handlePost(request);
  logApi('translate', {
    status: res.status,
    ms: Date.now() - started,
    requestId,
  });
  return res;
}

async function handlePost(request: Request) {
  if (!checkRateLimit(rateLimitKey('translate', request), 30)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = parseTranslateBody(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { text, target, provider, apiKey: bodyKey } = parsed.value;
  const authHeader = request.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const apiKey = bearer || bodyKey || undefined;

  // Same gate as optimize-sync: server keys need a session, except in
  // unlimited local-dev mode where sign-in is unavailable.
  if (!apiKey && !(isUnlimitedMode() && hasServerKey(provider))) {
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to translate, or provide your own API key.' },
        { status: 401 },
      );
    }
  }

  let model;
  let modelId: string;
  try {
    const resolved = createProvider(provider, apiKey);
    model = resolved.model;
    modelId = resolved.modelId;
  } catch (e) {
    return NextResponse.json({ error: userFacingOptimizeError(e) }, { status: 400 });
  }

  try {
    const result = await generateText({
      model,
      system: buildTranslatorPrompt(target),
      prompt: text,
      maxRetries: 1,
    });
    const translatedText = (result.text ?? '').trim();
    if (!translatedText) {
      return NextResponse.json({ error: 'Empty translation' }, { status: 502 });
    }
    return NextResponse.json({ translatedText, targetLang: target, model: modelId });
  } catch (err) {
    return NextResponse.json({ error: userFacingOptimizeError(err) }, { status: 500 });
  }
}
