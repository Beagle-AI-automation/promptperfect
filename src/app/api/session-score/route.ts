import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { session_id?: string; score?: number };
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    const score =
      typeof body.score === 'number' && body.score >= 1 && body.score <= 100
        ? Math.round(body.score)
        : null;

    if (!sessionId || score === null) {
      return Response.json(
        { error: 'session_id and score (1-100) required' },
        { status: 400 },
      );
    }

    // PP-204 schema does not include a score column; accept but don't persist.
    return Response.json({ ok: true, skipped: true, session_id: sessionId, score });
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
