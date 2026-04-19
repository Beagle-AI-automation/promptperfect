'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';

interface Stats {
  total: number;
  thumbsUp: number;
  thumbsDown: number;
  avgScore: number | null;
  byMode: Record<string, number>;
  byProvider: Record<string, number>;
}

interface StatsBarProps {
  refreshTrigger?: number;
  /** Shown until the next successful stats fetch (instant +1 on feedback). */
  optimisticThumbs?: { up: number; down: number };
  /** Reset parent optimistic state after server stats have loaded. */
  onStatsFetched?: () => void;
}

function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#71717A]">
      {children}
    </span>
  );
}

function StatValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-base font-semibold tabular-nums tracking-tight text-[#E7E6D9]">
      {children}
    </span>
  );
}

export function StatsBar({
  refreshTrigger = 0,
  optimisticThumbs = { up: 0, down: 0 },
  onStatsFetched,
}: StatsBarProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const onStatsFetchedRef = useRef(onStatsFetched);
  onStatsFetchedRef.current = onStatsFetched;

  useEffect(() => {
    const emptyStats: Stats = {
      total: 0,
      thumbsUp: 0,
      thumbsDown: 0,
      avgScore: null,
      byMode: {},
      byProvider: {},
    };

    let cancelled = false;

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const headers = supabase
        ? await getPromptPerfectAuthHeaders(supabase)
        : null;

      try {
        const r = await fetch('/api/stats', {
          headers: headers ?? {},
        });
        const data = (await r.json()) as Stats & { error?: string };
        if (cancelled) return;
        if (!r.ok || data.error) {
          setStats(emptyStats);
          return;
        }
        setStats({
          total: data.total ?? 0,
          thumbsUp: data.thumbsUp ?? 0,
          thumbsDown: data.thumbsDown ?? 0,
          avgScore: data.avgScore ?? null,
          byMode: data.byMode ?? {},
          byProvider: data.byProvider ?? {},
        });
        if (!cancelled) onStatsFetchedRef.current?.();
      } catch {
        if (!cancelled) setStats(emptyStats);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const shellClass =
    'w-full rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-[#0A0A0A] px-4 py-3.5 sm:px-5 sm:py-4';

  if (loading) {
    return (
      <div className={shellClass}>
        <span className="text-sm text-[#71717A]">Loading analytics…</span>
      </div>
    );
  }

  if (!stats) return null;

  const thumbsUp =
    (stats.thumbsUp ?? 0) + (optimisticThumbs.up ?? 0);
  const thumbsDown =
    (stats.thumbsDown ?? 0) + (optimisticThumbs.down ?? 0);
  const satisfaction =
    thumbsUp + thumbsDown > 0
      ? Math.round((thumbsUp / (thumbsUp + thumbsDown)) * 100)
      : null;

  const modeParts = Object.entries(stats.byMode ?? {}).filter(([, c]) => c > 0);
  const hasQuality =
    satisfaction !== null || typeof stats.avgScore === 'number';
  const hasModes = modeParts.length > 0;

  const entirelyEmpty =
    (stats.total ?? 0) === 0 &&
    thumbsUp === 0 &&
    thumbsDown === 0 &&
    !hasModes &&
    stats.avgScore == null;

  if (entirelyEmpty) {
    return (
      <div className={shellClass}>
        <p className="text-center text-sm leading-relaxed text-[#71717A]">
          Analytics will appear here after you run optimizations and submit feedback.
        </p>
      </div>
    );
  }

  return (
    <div
      className={shellClass}
      role="region"
      aria-label="Analytics"
    >
      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 md:items-start">
        {/* Column 1: volume + reactions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex flex-col gap-1">
            <StatLabel>Total optimizations</StatLabel>
            <StatValue>{stats.total ?? 0}</StatValue>
          </div>
          <div
            className="hidden h-10 w-px shrink-0 bg-[#252525] sm:block"
            aria-hidden
          />
          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5">
                <ThumbsUp
                  className="h-4 w-4 text-emerald-500/90"
                  strokeWidth={2}
                  aria-hidden
                />
                <StatLabel>Positive</StatLabel>
              </span>
              <StatValue>{thumbsUp}</StatValue>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5">
                <ThumbsDown
                  className="h-4 w-4 text-rose-400/90"
                  strokeWidth={2}
                  aria-hidden
                />
                <StatLabel>Negative</StatLabel>
              </span>
              <StatValue>{thumbsDown}</StatValue>
            </div>
          </div>
        </div>

        {/* Column 2: satisfaction & score */}
        <div
          className={`flex flex-col justify-center gap-3 border-t border-[#252525] pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6 ${
            !hasQuality ? 'md:opacity-40' : ''
          }`}
        >
          {hasQuality ? (
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              {satisfaction !== null && (
                <div className="flex min-w-[7rem] flex-col gap-1">
                  <StatLabel>Satisfaction</StatLabel>
                  <StatValue>{satisfaction}%</StatValue>
                </div>
              )}
              {typeof stats.avgScore === 'number' && (
                <div className="flex min-w-[7rem] flex-col gap-1">
                  <StatLabel>Avg score</StatLabel>
                  <StatValue>{stats.avgScore}</StatValue>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#555]">No feedback scores yet</p>
          )}
        </div>

        {/* Column 3: modes */}
        <div
          className={`flex flex-col gap-2 border-t border-[#252525] pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6 ${
            !hasModes ? 'md:justify-center' : ''
          }`}
        >
          {hasModes ? (
            <>
              <StatLabel>By mode</StatLabel>
              <div className="flex flex-wrap gap-2">
                {modeParts.map(([mode, count]) => (
                  <span
                    key={mode}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#050505]/80 px-3 py-1.5 text-sm"
                  >
                    <span className="text-[#B0B0B0]">{mode}</span>
                    <span className="font-semibold tabular-nums text-[#E7E6D9]">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#555]">No mode breakdown yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
