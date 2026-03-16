"use client";

import { useState, useEffect } from "react";
import { History } from "lucide-react";
import { getHistory, type HistoryItem } from "@/lib/history";

export interface HistoryPanelProps {
  onSelectItem: (item: HistoryItem) => void;
  /** Increment to refetch history (e.g. after a new optimization is saved). */
  refreshKey?: number;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60_000) return "Just now";
    if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function truncate(s: string, len: number): string {
  if (!s) return "";
  return s.length <= len ? s : s.slice(0, len) + "…";
}

export function HistoryPanel({
  onSelectItem,
  refreshKey = 0,
}: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getHistory().then((list) => {
      if (!cancelled) {
        setItems(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = () => {
    setLoading(true);
    getHistory().then(setItems).finally(() => setLoading(false));
  };

  return (
    <div className="flex w-full min-w-0 flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <History className="h-4 w-4" aria-hidden />
          Prompt history
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          Refresh
        </button>
      </div>
      <div className="max-h-[320px] overflow-y-auto p-2">
        {loading ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No history yet. Optimize a prompt to see it here.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                    {truncate(item.prompt_original, 60)}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="capitalize">{item.mode}</span>
                    <span>·</span>
                    <span>{formatTime(item.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
