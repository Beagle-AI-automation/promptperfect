import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const guestId =
      typeof body?.guestId === 'string' ? body.guestId.trim() : '';
    const targetSessionId =
      typeof body?.targetSessionId === 'string'
        ? body.targetSessionId.trim()
        : '';
    const userIdRaw =
      typeof body?.userId === 'string' ? body.userId.trim() : '';
    const userId = UUID_RE.test(userIdRaw) ? userIdRaw : undefined;

    if (
      !guestId.startsWith('guest_') ||
      guestId.length > 80 ||
      !targetSessionId ||
      targetSessionId.length > 200 ||
      guestId === targetSessionId
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ ok: true, skipped: true, migrated: 0 });
    }

    const updates: { session_id: string; user_id?: string } = {
      session_id: targetSessionId,
    };
    if (userId) updates.user_id = userId;

    const { data, error } = await supabase
      .from('pp_optimization_history')
      .update(updates)
      .eq('session_id', guestId)
      .select('id');

    if (error) {
      console.error('[claim-guest-history]', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    const { error: delErr } = await supabase
      .from('guest_usage')
      .delete()
      .eq('guest_id', guestId);

    if (delErr) {
      const msg = String(delErr.message || '');
      if (!/does not exist|could not find|schema cache/i.test(msg)) {
        console.warn('[claim-guest-history] guest_usage cleanup:', msg);
      }
    }

    return NextResponse.json({
      ok: true,
      migrated: data?.length ?? 0,
    });
  } catch (e) {
    console.error('[claim-guest-history]', e);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
