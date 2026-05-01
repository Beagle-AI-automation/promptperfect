import { NextResponse } from 'next/server';
import { migrateGuestHistoryAdmin } from '@/lib/server/guestHistoryMigration';
import { createRouteHandlerClient } from '@/lib/server/supabase';

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { guestId?: string };
    const userId = user.id;
    const guestId = typeof body.guestId === 'string' ? body.guestId.trim() : '';

    if (!guestId) {
      return NextResponse.json({ error: 'guestId is required' }, { status: 400 });
    }

    const { error } = await migrateGuestHistoryAdmin(userId, guestId);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ migrated: true });
  } catch {
    // swallow: JSON parse or validation error
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
