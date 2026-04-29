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

    const body = await request.json();
    const userId = user.id;
    const provider = typeof body.provider === 'string' ? body.provider : undefined;
    const model = typeof body.model === 'string' ? body.model : undefined;
    const api_key = typeof body.api_key === 'string' ? body.api_key : undefined;

    const admin = getSupabaseAdminClient();
    if (!admin) {
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

    const { data: updatedRow, error } = await admin
      .from('pp_users')
      .update(updates)
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Update failed' },
        { status: 500 }
      );
    }

    if (!updatedRow) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
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
