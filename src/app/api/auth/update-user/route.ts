import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabase';
import { createRouteHandlerClient } from '@/lib/server/supabase';
import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit';
import { logWarn } from '@/lib/logger';
import { parseUpdateUserBody } from '@/lib/apiSchemas';

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(rateLimitKey('auth/update-user', request), 20)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 },
      );
    }

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
    const parsed = parseUpdateUserBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { provider, model, apiKey } = parsed.value;
    // NOTE (secret boundary): the BYOK key is stored as-sent in pp_users so
    // the server can call providers on the user's behalf. It is scoped to
    // the authenticated user (service-role write + RLS), never logged, and
    // never echoed back in any response. See SECURITY_AUDIT.md.

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
    if (apiKey !== undefined) updates.api_key = apiKey;

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
      logWarn('update-user', `pp_users update failed: ${error.message}`);
      return NextResponse.json(
        { error: 'Update failed' },
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
    // swallow: JSON parse or validation error
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
