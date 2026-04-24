'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/client/supabase';
import {
  getLocalHistoryForSession,
  getOrCreateSessionId,
} from '@/lib/client/optimizationHistory';

export interface OptimizationHistoryItem {
  id: string;
  session_id: string;
  /** Per-run id matching `optimization_logs.session_id` (feedback). */
  optimize_session_id?: string | null;
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  created_at: string;
}

interface HistoryPanelProps {
  onSelect: (item: OptimizationHistoryItem) => void;
  /** Clears the composer and returns to a blank “new prompt” state (sidebar control). */
  onNewPrompt?: () => void;
  /** Called after a row is removed via the API (library rows linked to that history are removed server-side). */
  onDeleted?: (id: string) => void;
  refreshTrigger?: number;
  selectedId?: string | null;
  /**
   * Required for signed-in users: history rows are keyed by account, not browser session.
   * Without this, everyone on the same device shares one `session_id` and histories clash.
   */
  userId?: string;
  /** Fallback when userId is absent: guest fingerprint or browser session id. */
  historySessionId?: string;
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
  onNewPrompt,
  onDeleted,
  refreshTrigger = 0,
  selectedId = null,
  userId,
  historySessionId,
}: HistoryPanelProps) {
  const [rows, setRows] = useState<OptimizationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = createSupabaseBrowserClient();
    const uid = userId?.trim();

    setLoading(true);
    try {
      const localRows = getLocalHistoryForSession(sid);
      if (!client) {
        const merged = [...localRows].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setRows(merged.slice(0, 20));
        return;
      }

      const { data, error } = await client
        .from('pp_optimization_history')
        .select(
          'id,session_id,optimize_session_id,prompt_original,prompt_optimized,mode,explanation,created_at',
        )
        .eq('session_id', sid)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const remote = (data as OptimizationHistoryItem[]) ?? [];
      const merged = [...remote, ...localRows].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setRows(merged.slice(0, 20));
    } catch {
      const localRows = getLocalHistoryForSession(sid);
      const merged = [...localRows].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setRows(merged.slice(0, 20));
    } finally {
      setLoading(false);
    }
  }, [historySessionId, userId]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const handleDelete = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, itemId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const uid = userId?.trim();
      if (!uid || deletingId) return;
      const client = createSupabaseBrowserClient();
      if (!client) return;
      setDeletingId(itemId);
      try {
        const headers = await getPromptPerfectAuthHeaders(client);
        if (!headers) return;
        const res = await fetch(
          `/api/history?id=${encodeURIComponent(itemId)}`,
          { method: 'DELETE', headers },
        );
        if (!res.ok) return;
        onDeleted?.(itemId);
        await load();
      } finally {
        setDeletingId(null);
      }
    },
    [userId, deletingId, load, onDeleted],
  );

  return (
    <div className="flex h-full flex-col border-l border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#1a1a1a] px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666]">
          History
        </span>
        {onNewPrompt ? (
          <button
            type="button"
            onClick={() => onNewPrompt()}
            title="New prompt"
            aria-label="New prompt"
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#141414] px-2.5 text-[12px] font-medium text-[#ccc] transition hover:border-[#3f3f46] hover:bg-[#1a1a1a] hover:text-[#E7E6D9]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            <span className="hidden sm:inline">New</span>
          </button>
        ) : null}
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
                <li key={item.id} className="flex items-stretch gap-0">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className={`min-w-0 flex-1 px-3 py-2.5 text-left transition hover:bg-[#141414] ${
                      selectedId && item.id === selectedId ? 'bg-[#141414]' : ''
                    }`}
                  >
                    <p className="line-clamp-2 text-[13px] leading-snug text-[#ccc]">{preview}</p>
                    <p className="mt-1 text-[11px] text-[#666]">
                      {item.mode} · {formatTime(item.created_at)}
                    </p>
                  </button>
                  {userId?.trim() ? (
                    <button
                      type="button"
                      aria-label="Delete from history"
                      title="Delete from history"
                      disabled={deletingId === item.id}
                      onClick={(e) => void handleDelete(e, item.id)}
                      className="shrink-0 px-2.5 py-2 text-[#555] transition hover:bg-[#1a1a1a] hover:text-[#e85d5d] disabled:opacity-40"
                    >
                      {deletingId === item.id ? (
                        <span className="text-[11px]">…</span>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      )}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
