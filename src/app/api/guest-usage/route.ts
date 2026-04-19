import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import { GUEST_LIMIT } from '@/lib/guest';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const guestId =
      typeof body?.guestId === 'string' ? body.guestId.trim() : '';
    const mode = typeof body?.mode === 'string' ? body.mode : null;
    const provider =
      typeof body?.provider === 'string' ? body.provider : null;

    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({
        persisted: false,
        limit: GUEST_LIMIT,
      });
    }

    const { data: existing, error: selectErr } = await supabase
      .from('guest_usage')
      .select('optimization_count')
      .eq('guest_id', guestId)
      .maybeSingle();

    if (selectErr) {
      console.warn(
        '[guest-usage] select failed — using local guest count only. Run migration 20250404000000_guest_usage.sql if you need server-side limits.',
        selectErr.message,
      );
      return NextResponse.json({
        persisted: false,
        limit: GUEST_LIMIT,
      });
    }

    const currentCount = existing?.optimization_count ?? 0;

    if (currentCount >= GUEST_LIMIT) {
      return NextResponse.json(
        {
          error: 'Guest limit reached. Sign up for unlimited access.',
          limitReached: true,
          count: currentCount,
          limit: GUEST_LIMIT,
        },
        { status: 429 },
      );
    }

    const newCount = currentCount + 1;
    const { error: upsertErr } = await supabase.from('guest_usage').upsert(
      {
        guest_id: guestId,
        optimization_count: newCount,
        last_used_at: new Date().toISOString(),
        last_mode: mode,
        last_provider: provider,
      },
      { onConflict: 'guest_id' },
    );

    if (upsertErr) {
      console.warn(
        '[guest-usage] upsert failed — using local guest count only.',
        upsertErr.message,
      );
      return NextResponse.json({
        persisted: false,
        limit: GUEST_LIMIT,
      });
    }

    return NextResponse.json({
      count: newCount,
      limit: GUEST_LIMIT,
      remaining: Math.max(0, GUEST_LIMIT - newCount),
      persisted: true,
    });
  } catch (e) {
    console.error('[guest-usage] POST', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId')?.trim();

    if (!guestId) {
      return NextResponse.json({
        count: 0,
        limit: GUEST_LIMIT,
        remaining: GUEST_LIMIT,
        serverTracking: true,
      });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ serverTracking: false });
    }

    const { data, error } = await supabase
      .from('guest_usage')
      .select('optimization_count')
      .eq('guest_id', guestId)
      .maybeSingle();

    if (error) {
      console.warn('[guest-usage] GET failed — client will use local count only.', error.message);
      return NextResponse.json({ serverTracking: false });
    }

    const count = data?.optimization_count ?? 0;

    return NextResponse.json({
      count,
      limit: GUEST_LIMIT,
      remaining: Math.max(0, GUEST_LIMIT - count),
      serverTracking: true,
    });
  } catch (e) {
    console.error('[guest-usage] GET', e);
    return NextResponse.json({
      count: 0,
      limit: GUEST_LIMIT,
      remaining: GUEST_LIMIT,
    });
  }
}
