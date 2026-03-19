import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId')?.trim() || undefined;
  const sessionId = searchParams.get('sessionId')?.trim() || undefined;

  if (!userId && !sessionId) {
    return NextResponse.json(
      { error: 'Provide userId or sessionId' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { tokensUsed: 0, tokenLimit: 0, isBYOK: true, remaining: 0 },
    );
  }

  if (userId) {
    const { data: user } = await supabase
      .from('pp_users')
      .select('demo_tokens_used, demo_token_limit, api_key')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { tokensUsed: 0, tokenLimit: 100, isBYOK: false, remaining: 100 },
      );
    }

    const hasApiKey = typeof user.api_key === 'string' && user.api_key.trim() !== '';
    if (hasApiKey) {
      return NextResponse.json({
        tokensUsed: 0,
        tokenLimit: 0,
        isBYOK: true,
        remaining: 0,
      });
    }

    const used = Number(user.demo_tokens_used) || 0;
    const limit = Number(user.demo_token_limit) || 100;
    return NextResponse.json({
      tokensUsed: used,
      tokenLimit: limit,
      isBYOK: false,
      remaining: Math.max(0, limit - used),
    });
  }

  // Guest by sessionId
  const { data: guest } = await supabase
    .from('pp_guest_sessions')
    .select('tokens_used, token_limit')
    .eq('session_id', sessionId!)
    .single();

  const used = guest ? Number(guest.tokens_used) || 0 : 0;
  const limit = guest ? Number(guest.token_limit) || 50 : 50;
  return NextResponse.json({
    tokensUsed: used,
    tokenLimit: limit,
    isBYOK: false,
    remaining: Math.max(0, limit - used),
  });
}
