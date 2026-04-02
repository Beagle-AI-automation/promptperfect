import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { historyId } = body as { historyId?: string };

    if (!historyId || typeof historyId !== 'string') {
      return NextResponse.json(
        { error: 'historyId is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Check if this historyId already has a share_id
    const { data: existing, error: fetchError } = await client
      .from('pp_optimization_history')
      .select('share_id')
      .eq('id', historyId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Optimization not found' },
        { status: 404 }
      );
    }

    // If already has a share_id, return it
    if (existing.share_id) {
      const shareUrl = `${req.nextUrl.origin}/s/${existing.share_id}`;
      return NextResponse.json({ shareUrl, shareId: existing.share_id });
    }

    // Generate a new share_id
    const shareId = nanoid(10);

    const { error: updateError } = await client
      .from('pp_optimization_history')
      .update({ share_id: shareId })
      .eq('id', historyId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to generate share link' },
        { status: 500 }
      );
    }

    const shareUrl = `${req.nextUrl.origin}/s/${shareId}`;
    return NextResponse.json({ shareUrl, shareId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
