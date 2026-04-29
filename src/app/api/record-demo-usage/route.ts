import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import { createRouteHandlerClient } from '@/lib/server/supabase';

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const body = await request.json();
    const sessionId =
      typeof body.sessionId === 'string' ? body.sessionId.trim() : undefined;
    const tokensConsumed = Math.max(0, Math.ceil(Number(body.tokensConsumed) || 0));

    const userId = !authError && user?.id ? user.id : undefined;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Sign in or provide sessionId' },
        { status: 400 },
      );
    }
    if (tokensConsumed <= 0) {
      return NextResponse.json({ ok: true });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: true });
    }

    if (userId) {
      const { data: row } = await admin
        .from('pp_users')
        .select('demo_tokens_used')
        .eq('id', userId)
        .single();
      if (row) {
        const newUsed = (Number(row.demo_tokens_used) || 0) + tokensConsumed;
        await admin
          .from('pp_users')
          .update({ demo_tokens_used: newUsed })
          .eq('id', userId);
      }
    } else if (sessionId) {
      const { data: guest } = await admin
        .from('pp_guest_sessions')
        .select('tokens_used')
        .eq('session_id', sessionId)
        .single();
      if (guest) {
        const newUsed = (Number(guest.tokens_used) || 0) + tokensConsumed;
        await admin
          .from('pp_guest_sessions')
          .update({ tokens_used: newUsed })
          .eq('session_id', sessionId);
      } else {
        await admin.from('pp_guest_sessions').insert({
          session_id: sessionId,
          tokens_used: tokensConsumed,
          token_limit: 50,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
