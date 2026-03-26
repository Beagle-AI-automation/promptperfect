'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/client/supabase';
import { getOrCreateSessionId } from '@/lib/client/optimizationHistory';

export interface OptimizationHistoryItem {
  id: string;
  session_id: string;
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  created_at: string;
}

interface HistoryPanelProps {
  onSelect: (item: OptimizationHistoryItem) => void;
  refreshTrigger?: number;
  selectedId?: string | null;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function HistoryPanel({
  onSelect,
  refreshTrigger = 0,
  selectedId = null,
}: HistoryPanelProps) {
  const [rows, setRows] = useState<OptimizationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const client = getSupabaseClient();
    const sid = getOrCreateSessionId();
    if (!client || !sid) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await client
        .from('pp_optimization_history')
        .select('id,session_id,prompt_original,prompt_optimized,mode,explanation,created_at')
        .eq('session_id', sid)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRows((data as OptimizationHistoryItem[]) ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  return (
    <div className="flex h-full flex-col border-l border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="shrink-0 border-b border-[#1a1a1a] px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666]">
          History
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pp-history-scroll">
        {loading ? (
          <p className="px-3 py-2 text-[13px] text-[#666]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-2 text-[13px] text-[#666]">No history yet.</p>
        ) : (
          <ul className="divide-y divide-[#1a1a1a]">
            {rows.map((item) => {
              const preview =
                item.prompt_original.length > 60
                  ? `${item.prompt_original.slice(0, 60)}…`
                  : item.prompt_original;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className={`w-full px-3 py-2.5 text-left transition hover:bg-[#141414] ${
                      selectedId && item.id === selectedId ? 'bg-[#141414]' : ''
                    }`}
                  >
                    <p className="line-clamp-2 text-[13px] leading-snug text-[#ccc]">{preview}</p>
                    <p className="mt-1 text-[11px] text-[#666]">
                      {item.mode} · {formatTime(item.created_at)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
