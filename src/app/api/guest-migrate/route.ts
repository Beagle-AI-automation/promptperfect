import { NextResponse } from 'next/server';
import { migrateGuestHistoryAdmin } from '@/lib/server/guestHistoryMigration';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { userId?: string; guestId?: string };
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const guestId = typeof body.guestId === 'string' ? body.guestId.trim() : '';

    if (!userId || !guestId) {
      return NextResponse.json({ error: 'userId and guestId are required' }, { status: 400 });
    }

    const { error } = await migrateGuestHistoryAdmin(userId, guestId);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ migrated: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
