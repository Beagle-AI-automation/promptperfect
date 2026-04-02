import { checkRateLimit } from '@/lib/auth/rateLimit';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/client/supabase';
import { migrateGuestHistoryAdmin } from '@/lib/server/guestHistoryMigration';

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const guestId =
      typeof body.guestId === 'string' ? body.guestId.trim() : '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !anonKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const supabaseAuth = createClient(url, anonKey);
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });

    if (!authError && authData.session && authData.user) {
      const admin = getSupabaseAdminClient();
      if (!admin) {
        return NextResponse.json(
          { error: 'Database not configured' },
          { status: 503 },
        );
      }

      let { data: row } = await admin
        .from('pp_users')
        .select('id, name, email, provider, model')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!row) {
        const { data: byEmail } = await admin
          .from('pp_users')
          .select('id, name, email, provider, model')
          .eq('email', email)
          .maybeSingle();
        if (byEmail) {
          row = byEmail;
        } else {
          await admin.from('pp_users').insert({
            id: authData.user.id,
            name: null,
            email,
            password_hash: 'supabase_auth',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            api_key: '',
          });
          const { data: inserted } = await admin
            .from('pp_users')
            .select('id, name, email, provider, model')
            .eq('id', authData.user.id)
            .maybeSingle();
          row = inserted;
        }
      }

      if (!row) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 },
        );
      }

      let guestMigrated = false;
      if (guestId) {
        const { error: migErr } = await migrateGuestHistoryAdmin(row.id, guestId);
        guestMigrated = !migErr;
      }

      return NextResponse.json({
        user: row,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        },
        guestMigrated,
      });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const { data: user, error } = await admin
      .from('pp_users')
      .select('id, name, email, password_hash, provider, model')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    if (user.password_hash === 'supabase_auth') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    const inputHash = await sha256Hex(password);
    if (inputHash !== user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    let guestMigrated = false;
    if (guestId) {
      const { error: migErr } = await migrateGuestHistoryAdmin(user.id, guestId);
      guestMigrated = !migErr;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        model: user.model,
      },
      guestMigrated,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
