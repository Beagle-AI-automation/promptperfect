import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import { createRouteHandlerClient } from '@/lib/server/supabase';

export async function POST(request: Request) {
  try {
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

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

    const isValidGuestId =
      guestId.length > 0 &&
      guestId.length <= 80 &&
      // Accept UUID format (e.g. crypto.randomUUID()) or legacy 'guest_' / 'guest-' prefixed IDs
      (/^[0-9a-f-]{36}$/i.test(guestId) || guestId.startsWith('guest'));
    if (
      !isValidGuestId ||
      !targetSessionId ||
      targetSessionId.length > 200 ||
      guestId === targetSessionId
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: true, skipped: true, migrated: 0 });
    }

    const updates: { session_id: string; user_id: string } = {
      session_id: targetSessionId,
      user_id: userId,
    };

    const { data, error } = await admin
      .from('pp_optimization_history')
      .update(updates)
      .eq('session_id', guestId)
      .select('id');

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[claim-guest-history]', error);
      }
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    const { error: delErr } = await admin
      .from('guest_usage')
      .delete()
      .eq('guest_id', guestId);

    if (delErr) {
      const msg = String(delErr.message || '');
      if (
        !/does not exist|could not find|schema cache/i.test(msg) &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.warn('[claim-guest-history] guest_usage cleanup:', msg);
      }
    }

    return NextResponse.json({
      ok: true,
      migrated: data?.length ?? 0,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[claim-guest-history]', e);
    }
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
