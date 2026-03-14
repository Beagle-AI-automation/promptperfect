import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
    const provider = typeof body.provider === 'string' ? body.provider : undefined;
    const model = typeof body.model === 'string' ? body.model : undefined;
    const api_key = typeof body.api_key === 'string' ? body.api_key : undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (provider !== undefined) updates.provider = provider;
    if (model !== undefined) updates.model = model;
    if (api_key !== undefined) updates.api_key = api_key;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from('pp_users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Update failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
