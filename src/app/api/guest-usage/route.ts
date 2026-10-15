import { NextResponse } from 'next/server'
import { GUEST_LIMIT, assertGuestId } from '@/lib/guest'
import { getServiceClient } from '@/lib/server/supabase'
import { getRequestId, logApi } from '@/lib/logger'
import { enforceRateLimit } from '@/lib/auth/rateLimit'

/**
 * Public, unauthenticated endpoint (no session, no auth header). The guest id
 * is client-generated, so it cannot identify a caller: only the IP can, and
 * only weakly. Throttle both verbs so the endpoint cannot be used to burn
 * server quota or to flood `guest_usage` rows.
 */
const GUEST_USAGE_RATE_LIMIT = 30

export async function POST(request: Request) {
  const started = Date.now();
  const res = await handlePost(request);
  logApi('guest-usage', {
    status: res.status,
    ms: Date.now() - started,
    requestId: getRequestId(request),
  });
  return res;
}

async function handlePost(request: Request) {
  const limited = enforceRateLimit('guest-usage', request, GUEST_USAGE_RATE_LIMIT)
  if (limited) return limited

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  let body: { guestId?: string; mode?: string; provider?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { guestId: rawGuestId, mode, provider } = body;
  const guestId = assertGuestId(rawGuestId);

  if (!guestId) {
    return NextResponse.json({ error: 'Guest ID required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('guest_usage')
    .select('optimization_count')
    .eq('guest_id', guestId)
    .single()

  const currentCount = existing?.optimization_count ?? 0

  if (currentCount >= GUEST_LIMIT) {
    return NextResponse.json(
      {
        error: 'Guest limit reached. Sign up for unlimited access.',
        limitReached: true,
        count: currentCount,
        limit: GUEST_LIMIT,
      },
      { status: 429 }
    )
  }

  const { error: upsertError } = await supabase
    .from('guest_usage')
    .upsert(
      {
        guest_id: guestId,
        optimization_count: currentCount + 1,
        last_used_at: new Date().toISOString(),
        last_mode: mode ?? null,
        last_provider: provider ?? null,
      },
      { onConflict: 'guest_id' }
    )

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 })
  }

  return NextResponse.json({
    count: currentCount + 1,
    limit: GUEST_LIMIT,
    remaining: GUEST_LIMIT - 1 - currentCount,
  })
}

export async function GET(request: Request) {
  const limited = enforceRateLimit('guest-usage', request, GUEST_USAGE_RATE_LIMIT)
  if (limited) return limited

  const supabase = getServiceClient()
  const { searchParams } = new URL(request.url)
  const guestId = assertGuestId(searchParams.get('guestId'))

  if (!guestId) {
    return NextResponse.json({ count: 0, limit: GUEST_LIMIT, remaining: GUEST_LIMIT })
  }

  if (!supabase) {
    // Signal to client that server tracking is unavailable — don't overwrite local count.
    return NextResponse.json({ count: 0, limit: GUEST_LIMIT, remaining: GUEST_LIMIT, serverTracking: false })
  }

  const { data } = await supabase
    .from('guest_usage')
    .select('optimization_count')
    .eq('guest_id', guestId)
    .single()

  const count = data?.optimization_count ?? 0

  return NextResponse.json({
    count,
    limit: GUEST_LIMIT,
    remaining: Math.max(0, GUEST_LIMIT - count),
  })
}
