'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';

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
}

function StatsDivider() {
  return (
    <span className="mx-2 shrink-0 text-[#2a2a2a]" aria-hidden>
      |
    </span>
  );
}

export function StatsBar({ refreshTrigger = 0 }: StatsBarProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const emptyStats: Stats = {
      total: 0,
      thumbsUp: 0,
      thumbsDown: 0,
      avgScore: null,
      byMode: {},
      byProvider: {},
    };
    fetch('/api/stats')
      .then(async (r) => {
        const data = (await r.json()) as Stats & { error?: string };
        if (!r.ok || data.error) return emptyStats;
        return {
          total: data.total ?? 0,
          thumbsUp: data.thumbsUp ?? 0,
          thumbsDown: data.thumbsDown ?? 0,
          avgScore: data.avgScore ?? null,
          byMode: data.byMode ?? {},
          byProvider: data.byProvider ?? {},
        };
      })
      .then(setStats)
      .catch(() => setStats(emptyStats))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="rounded-[10px] border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-2.5 text-[13px]">
        <span className="text-[#555]">Loading analytics…</span>
      </div>
    );
  }

  if (!stats) return null;

  const thumbsUp = stats.thumbsUp ?? 0;
  const thumbsDown = stats.thumbsDown ?? 0;
  const satisfaction =
    thumbsUp + thumbsDown > 0
      ? Math.round((thumbsUp / (thumbsUp + thumbsDown)) * 100)
      : null;

  const modeParts = Object.entries(stats.byMode ?? {}).filter(([, c]) => c > 0);

  return (
    <div
      className="flex min-h-[40px] flex-wrap items-center rounded-[10px] border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-2.5 text-[13px] transition-colors duration-200 ease-out"
      role="region"
      aria-label="Analytics"
    >
      <span className="text-[#555]">Total</span>
      <span className="ml-1.5 font-medium tabular-nums text-white">
        {stats.total ?? 0}
      </span>
      <StatsDivider />
      <span className="inline-flex items-center gap-1 text-[#555]">
        <ThumbsUp className="h-3.5 w-3.5 text-[#555]" aria-hidden />
        <span className="tabular-nums text-white">{thumbsUp}</span>
      </span>
      <StatsDivider />
      <span className="inline-flex items-center gap-1 text-[#555]">
        <ThumbsDown className="h-3.5 w-3.5 text-[#555]" aria-hidden />
        <span className="tabular-nums text-white">{thumbsDown}</span>
      </span>
      {satisfaction !== null && (
        <>
          <StatsDivider />
          <span className="text-[#555]">Satisfaction</span>
          <span className="ml-1.5 font-medium tabular-nums text-white">
            {satisfaction}%
          </span>
        </>
      )}
      {typeof stats.avgScore === 'number' && (
        <>
          <StatsDivider />
          <span className="text-[#555]">Avg score</span>
          <span className="ml-1.5 font-medium tabular-nums text-white">
            {stats.avgScore}
          </span>
        </>
      )}
      {modeParts.length > 0 && (
        <>
          <StatsDivider />
          <span className="text-[#555]">Modes</span>
          <span className="ml-1.5 text-white">
            {modeParts.map(([mode, count], i) => (
              <span key={mode}>
                {i > 0 ? <span className="text-[#444]"> · </span> : null}
                <span className="text-[#555]">{mode}</span>
                <span className="ml-0.5 tabular-nums text-white">{count}</span>
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
}
