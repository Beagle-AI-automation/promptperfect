'use client';

import { History, Plus, Trash2 } from 'lucide-react';
import { useOptimizationHistory } from '@/hooks/useOptimizationHistory';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  formatHistoryTime,
  previewPrompt,
  type OptimizationHistoryItem,
} from '@/lib/historyMerge';

export type { OptimizationHistoryItem };

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

export function HistoryPanel({
  onSelect,
  onNewPrompt,
  onDeleted,
  refreshTrigger = 0,
  selectedId = null,
  userId,
  historySessionId,
}: HistoryPanelProps) {
  const {
    rows,
    loading,
    deletingId,
    deleteError,
    removeItem,
    dismissError,
  } = useOptimizationHistory({
    userId,
    historySessionId,
    refreshTrigger,
    onDeleted,
  });

  return (
    <div className="flex h-full flex-col border-l border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#1a1a1a] px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#808088]">
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
      {deleteError && (
        <div className="shrink-0 border-t border-rose-900/40 bg-rose-950/30 px-3 py-2">
          <p className="text-[11px] text-rose-400">{deleteError}</p>
          <button
            type="button"
            onClick={() => dismissError()}
            className="mt-0.5 text-[10px] text-rose-500/70 underline hover:text-rose-400"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto pp-history-scroll">
        {loading ? (
          <p className="px-3 py-2 text-[13px] text-[#808088]" aria-busy="true">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No history yet"
            description="Run an optimization and it will show up here so you can revisit, re-run, or save it to your library."
          />
        ) : (
          <ul className="divide-y divide-[#1a1a1a]">
            {rows.map((item) => (
              <li key={item.id} className="flex items-stretch gap-0">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`min-w-0 flex-1 px-3 py-2.5 text-left transition hover:bg-[#141414] ${
                    selectedId && item.id === selectedId ? 'bg-[#141414]' : ''
                  }`}
                >
                  <p className="line-clamp-2 text-[13px] leading-snug text-[#ccc]">
                    {previewPrompt(item.prompt_original)}
                  </p>
                  <p className="mt-1 text-[11px] text-[#808088]">
                    {item.mode} · {formatHistoryTime(item.created_at)}
                  </p>
                </button>
                {userId?.trim() && !item.id.startsWith('lib-') ? (
                  <button
                    type="button"
                    aria-label="Delete from history"
                    title="Delete from history"
                    disabled={deletingId === item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void removeItem(item.id);
                    }}
                    className="shrink-0 px-2.5 py-2 text-[#555] transition hover:bg-[#1a1a1a] hover:text-[#e85d5d] disabled:opacity-40"
                  >
                    {deletingId === item.id ? (
                      <span className="text-[11px]">…</span>
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
