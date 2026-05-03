import { NextResponse } from 'next/server';

const TIMEOUT_MS = 5000;

const CHECK_URLS: Record<
  string,
  (k: string) => Promise<Response>
> = {
  openai: (k) =>
    fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${k}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  gemini: (k) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    ),
  anthropic: (k) =>
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': k,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'Bad request' },
      { status: 400 },
    );
  }

  const { provider, apiKey } = body as {
    provider?: string;
    apiKey?: string;
  };

  const fn = provider ? CHECK_URLS[provider] : undefined;
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';

  if (!fn || !key) {
    return NextResponse.json(
      { ok: false, reason: 'Bad request' },
      { status: 400 },
    );
  }

  try {
    const r = await fn(key);
    if (r.ok) {
      return NextResponse.json({ ok: true });
    }
    if (r.status === 401 || r.status === 403) {
      return NextResponse.json({ ok: false, reason: 'Invalid key' });
    }
    return NextResponse.json({
      ok: false,
      reason: 'Provider unreachable',
    });
  } catch {
    return NextResponse.json({
      ok: false,
      reason: 'Provider unreachable',
    });
  }
}
