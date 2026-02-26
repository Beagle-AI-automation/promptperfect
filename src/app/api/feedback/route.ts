import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function isMissingColumnError(message: string): boolean {
  // PostgREST schema cache message for unknown columns, e.g.:
  // "Could not find the 'feedback' column of 'optimization_logs' in the schema cache"
  return /Could not find the '.*' column of 'optimization_logs' in the schema cache/i.test(message);
}

export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !key) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  const supabase = createClient(url, key);

  const {
    mode,
    provider,
    inputLength,
    outputLength,
    feedback,
    sessionId,
  } = (await req.json()) as {
    mode?: string;
    provider?: string;
    inputLength?: number;
    outputLength?: number;
    feedback?: string;
    sessionId?: string;
  };

  if (!mode || typeof mode !== 'string') {
    return Response.json({ error: 'mode is required' }, { status: 400 });
  }
  if (!feedback || typeof feedback !== 'string') {
    return Response.json({ error: 'feedback is required' }, { status: 400 });
  }

  // Normalize mode to match Supabase check constraint: only 'better' | 'specific' | 'cot'
  const ALLOWED_MODES = ['better', 'specific', 'cot'] as const;
  const normalizedMode = ALLOWED_MODES.includes(mode.toLowerCase() as (typeof ALLOWED_MODES)[number])
    ? (mode.toLowerCase() as (typeof ALLOWED_MODES)[number])
    : 'better';

  const primary = await supabase.from('optimization_logs').insert({
    mode: normalizedMode,
    provider,
    input_length: inputLength,
    output_length: outputLength,
    feedback,
    session_id: sessionId,
  });

  if (primary.error) {
    // Backward-compatible fallback if the table schema is still the older shape.
    if (isMissingColumnError(primary.error.message)) {
      const legacy = await supabase.from('optimization_logs').insert({
        session_id: sessionId,
        mode: normalizedMode,
        provider,
        prompt_length: inputLength,
        rating: feedback === 'up' ? 1 : -1,
      });
      if (legacy.error) return Response.json({ error: legacy.error.message }, { status: 500 });
      return Response.json({ success: true, legacy: true });
    }
    return Response.json({ error: primary.error.message }, { status: 500 });
  }
  return Response.json({ success: true });
}
