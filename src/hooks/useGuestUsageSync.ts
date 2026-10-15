'use client';

import { useEffect } from 'react';
import { getGuestCount, getGuestId, setGuestCount } from '@/lib/guest';

interface GuestUsageSyncOptions {
  mounted: boolean;
  hydrated: boolean;
  /** Signed-in user id (`null` for guests). Sync runs for guests only. */
  userId: string | null | undefined;
  /** Called after the server count merges into the local counter. */
  onSynced: () => void;
}

/**
 * One-shot merge of the server-side guest counter into localStorage once the
 * app hydrates. Guests only — signed-in users track usage server-side.
 * Extracted verbatim from the `/app` workspace page.
 */
export function useGuestUsageSync({
  mounted,
  hydrated,
  userId,
  onSynced,
}: GuestUsageSyncOptions): void {
  useEffect(() => {
    if (!mounted || !hydrated || userId) return;
    const gid = getGuestId();
    if (!gid) return;
    void fetch(`/api/guest-usage?guestId=${encodeURIComponent(gid)}`)
      .then((r) => r.json())
      .then((data: { count?: number; serverTracking?: boolean }) => {
        if (data.serverTracking === false) return;
        if (typeof data.count === 'number') {
          const merged = Math.max(getGuestCount(), data.count);
          setGuestCount(merged);
          onSynced();
        }
      })
      .catch(() => {});
    // `onSynced` must be a stable callback (useCallback) so this stays one-shot.
  }, [mounted, hydrated, userId, onSynced]);
}
