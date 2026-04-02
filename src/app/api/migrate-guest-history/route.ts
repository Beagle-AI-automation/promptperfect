import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { migrateGuestHistoryAdmin } from '@/lib/server/guestHistoryMigration';

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: 'Server is missing Supabase configuration' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAuth = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token);

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    guestId?: string;
  };
  const guestId = typeof body.guestId === 'string' ? body.guestId.trim() : '';
  if (!guestId) {
    return NextResponse.json({ error: 'guestId required' }, { status: 400 });
  }

  const { error } = await migrateGuestHistoryAdmin(user.id, guestId);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
