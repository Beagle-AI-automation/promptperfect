'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STATS_REFRESH_DELAYS_MS = [450, 1100, 2600, 5200];

/**
 * Optimistic thumbs-up/down overlay for the stats bar. Captures the server
 * baseline at submit time and clears the overlay once server totals move off
 * it — so the UI never double-counts while `/api/stats` catches up.
 * History refreshes immediately; stats refresh on a delay cascade.
 */
export function useOptimisticThumbs(callbacks: {
  onStatsRefresh: () => void;
  onHistoryRefresh: () => void;
}) {
  const [thumbOptimistic, setThumbOptimistic] = useState({ up: 0, down: 0 });
  /** Last successful /api/stats thumb counts. */
  const lastServerThumbsRef = useRef({ up: 0, down: 0 });
  /** Baseline thumbs at feedback submit time; null when nothing pending. */
  const thumbFeedbackPendingRef = useRef<{
    baselineUp: number;
    baselineDown: number;
  } | null>(null);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const handleStatsThumbsSynced = useCallback(    (payload: { thumbsUp: number; thumbsDown: number }) => {
      const nu = Number(payload.thumbsUp);
      const nd = Number(payload.thumbsDown);
      const up = Number.isFinite(nu) ? nu : 0;
      const down = Number.isFinite(nd) ? nd : 0;

      const pending = thumbFeedbackPendingRef.current;
      if (pending) {
        const bu = Number(pending.baselineUp);
        const bd = Number(pending.baselineDown);
        const baseUp = Number.isFinite(bu) ? bu : 0;
        const baseDown = Number.isFinite(bd) ? bd : 0;
        /** Only drop optimistic overlay once totals actually move off the pre-submit baseline. */
        const serverCaughtUp = up !== baseUp || down !== baseDown;
        if (serverCaughtUp) {
          thumbFeedbackPendingRef.current = null;
          setThumbOptimistic({ up: 0, down: 0 });
        }
      }
      lastServerThumbsRef.current = { up, down };
    },
    [],
  );

  /**
   * Seed the server baseline (e.g. from the cached stats snapshot when
   * remounting after visiting other routes) so the first submit compares
   * against real totals instead of zeros.
   */
  const seedServerThumbs = useCallback((up: number, down: number) => {
    lastServerThumbsRef.current = {
      up: Number.isFinite(up) ? up : 0,
      down: Number.isFinite(down) ? down : 0,
    };
  }, []);

  const handleFeedbackSubmitted = useCallback((direction: 'up' | 'down') => {    thumbFeedbackPendingRef.current = {
      baselineUp: lastServerThumbsRef.current.up,
      baselineDown: lastServerThumbsRef.current.down,
    };
    setThumbOptimistic((o) => ({
      up: o.up + (direction === 'up' ? 1 : 0),
      down: o.down + (direction === 'down' ? 1 : 0),
    }));
    callbacksRef.current.onHistoryRefresh();
    for (const ms of STATS_REFRESH_DELAYS_MS) {
      window.setTimeout(() => {
        callbacksRef.current.onStatsRefresh();
      }, ms);
    }
  }, []);

  return { thumbOptimistic, handleStatsThumbsSynced, handleFeedbackSubmitted, seedServerThumbs };
}
