import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabase';
import { createRouteHandlerClient } from '@/lib/server/supabase';
import { parseClaimGuestHistoryBody } from '@/lib/apiSchemas';
import { logWarn } from '@/lib/logger';

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
    const parsed = parseClaimGuestHistoryBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { guestId, targetSessionId } = parsed.value;

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: true, skipped: true, migrated: 0 });
    }

    const updates: { session_id: string; user_id: string } = {
      session_id: targetSessionId,
      user_id: userId,
    };

    // Only unclaimed rows can be adopted: a signed-in user must never be able
    // to pull history that already belongs to someone else.
    const { data, error } = await admin
      .from('pp_optimization_history')
      .update(updates)
      .eq('session_id', guestId)
      .is('user_id', null)
      .select('id');

    if (error) {
      logWarn('claim-guest-history', `claim failed: ${error.message}`);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    const { error: delErr } = await admin
      .from('guest_usage')
      .delete()
      .eq('guest_id', guestId);

    if (delErr) {
      const msg = String(delErr.message || '');
      if (!/does not exist|could not find|schema cache/i.test(msg)) {
        logWarn('claim-guest-history', `guest_usage cleanup: ${msg}`);
      }
    }

    return NextResponse.json({
      ok: true,
      migrated: data?.length ?? 0,
    });
  } catch (e) {
    logWarn(
      'claim-guest-history',
      `request failed: ${e instanceof Error ? e.message : 'Invalid request'}`,
    );
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
