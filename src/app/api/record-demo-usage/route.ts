import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : undefined;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : undefined;
    const tokensConsumed = Math.max(0, Math.ceil(Number(body.tokensConsumed) || 0));

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Provide userId or sessionId' },
        { status: 400 }
      );
    }
    if (tokensConsumed <= 0) {
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ ok: true });
    }

    if (userId) {
      const { data: user } = await supabase
        .from('pp_users')
        .select('demo_tokens_used')
        .eq('id', userId)
        .single();
      if (user) {
        const newUsed = (Number(user.demo_tokens_used) || 0) + tokensConsumed;
        await supabase
          .from('pp_users')
          .update({ demo_tokens_used: newUsed })
          .eq('id', userId);
      }
    } else if (sessionId) {
      const { data: guest } = await supabase
        .from('pp_guest_sessions')
        .select('tokens_used')
        .eq('session_id', sessionId)
        .single();
      if (guest) {
        const newUsed = (Number(guest.tokens_used) || 0) + tokensConsumed;
        await supabase
          .from('pp_guest_sessions')
          .update({ tokens_used: newUsed })
          .eq('session_id', sessionId);
      } else {
        await supabase.from('pp_guest_sessions').insert({
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
