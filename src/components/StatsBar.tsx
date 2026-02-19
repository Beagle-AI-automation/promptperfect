'use client';

import { BarChart3, ThumbsDown, ThumbsUp } from 'lucide-react';
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
      <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 dark:text-zinc-500">
          <BarChart3 className="h-4 w-4 animate-pulse" />
          Loading analytics…
        </div>
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

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <BarChart3 className="h-4 w-4" />
        Analytics
      </div>
      <div className="flex items-center gap-6 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          Total: <strong>{stats.total ?? 0}</strong>
        </span>
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <ThumbsUp className="h-4 w-4" />
          <strong>{thumbsUp}</strong>
        </span>
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <ThumbsDown className="h-4 w-4" />
          <strong>{thumbsDown}</strong>
        </span>
        {satisfaction !== null && (
          <span className="text-zinc-600 dark:text-zinc-400">
            Satisfaction: <strong>{satisfaction}%</strong>
          </span>
        )}
        {typeof stats.avgScore === 'number' && (
          <span className="flex items-center gap-2">
            <div className="relative h-6 w-6 shrink-0">
              <svg className="h-6 w-6 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  strokeWidth="3"
                  className="stroke-zinc-200 dark:stroke-zinc-700"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  strokeWidth="3"
                  strokeDasharray={`${(stats.avgScore / 100) * 88} 88`}
                  strokeLinecap="round"
                  className="stroke-amber-500 dark:stroke-amber-400"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                {stats.avgScore}
              </span>
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Avg score
            </span>
          </span>
        )}
      </div>
      {Object.keys(stats.byMode ?? {}).length > 0 && (
        <div className="flex gap-2 text-xs">
          {Object.entries(stats.byMode ?? {}).map(([mode, count]) => (
            <span
              key={mode}
              className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800"
            >
              {mode}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
