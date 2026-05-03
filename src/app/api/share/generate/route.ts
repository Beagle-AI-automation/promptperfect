import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

import { getSupabaseAdminClient } from '@/lib/client/supabase';
import {
  jsonUnauthorizedDetails,
  resolveIdentity,
} from '@/lib/server/supabaseRequestIdentity';

export async function POST(req: NextRequest) {
  const identity = await resolveIdentity(req);
  if (!identity) {
    return NextResponse.json(await jsonUnauthorizedDetails(req), {
      status: 401,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body as { historyId?: string }).historyId;
    const historyId = typeof raw === 'string' ? raw.trim() : '';

    if (!historyId || !/^[\da-f-]{36}$/i.test(historyId)) {
      return NextResponse.json(
        { error: 'historyId is required' },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 },
      );
    }

    const { data: existing, error: fetchError } = await admin
      .from('pp_optimization_history')
      .select('share_id, user_id')
      .eq('id', historyId)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Optimization not found' },
        { status: 404 },
      );
    }

    if (existing.user_id !== identity.userId) {
      return NextResponse.json(
        { error: 'Optimization not found' },
        { status: 404 },
      );
    }

    if (existing.share_id) {
      const shareUrl = `${req.nextUrl.origin}/s/${existing.share_id}`;
      return NextResponse.json({ shareUrl, shareId: existing.share_id });
    }

    const shareId = nanoid(10);

    const { error: updateError } = await admin
      .from('pp_optimization_history')
      .update({ share_id: shareId })
      .eq('id', historyId)
      .eq('user_id', identity.userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to generate share link' },
        { status: 500 },
      );
    }

    const shareUrl = `${req.nextUrl.origin}/s/${shareId}`;
    return NextResponse.json({ shareUrl, shareId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
