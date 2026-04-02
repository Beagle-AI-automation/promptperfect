import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import { migrateGuestHistoryAdmin } from '@/lib/server/guestHistoryMigration';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password_hash = typeof body.password_hash === 'string' ? body.password_hash : '';
    const guestId =
      typeof body.guestId === 'string' ? body.guestId.trim() : '';

    if (!email || !password_hash) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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

    const { data, error } = await supabase
      .from('pp_users')
      .insert({
        name: name || null,
        email,
        password_hash,
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        api_key: '',
      })
      .select('id, name, email, provider, model')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Signup failed' },
        { status: 500 }
      );
    }

    let guestMigrated = false;
    if (guestId && data?.id) {
      const { error: migErr } = await migrateGuestHistoryAdmin(data.id, guestId);
      guestMigrated = !migErr;
    }

    return NextResponse.json({
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        provider: data.provider,
        model: data.model,
      },
      guestMigrated,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
