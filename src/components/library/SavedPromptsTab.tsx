'use client';

import { ArrowRight, ChevronDown, ChevronUp, Search, SearchX, Trash2 } from 'lucide-react';
import {
  formatTimestamp,
  modeBadgeLabel,
  previewText,
  type LibraryModeFilter,
  type SavedPromptRow,
} from '@/lib/library';
import { EmptyState } from '@/components/ui/EmptyState';

const MODE_FILTERS = [
  { id: 'all' as const, label: 'All' },
  { id: 'better' as const, label: 'Better' },
  { id: 'specific' as const, label: 'Specific' },
  { id: 'cot' as const, label: 'CoT' },
] as const;

export interface SavedPromptsTabProps {
  totalCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  modeFilter: LibraryModeFilter;
  onModeFilterChange: (f: LibraryModeFilter) => void;
  loading: boolean;
  error: string | null;
  visibleRows: SavedPromptRow[];
  filteredCount: number;
  hasMore: boolean;
  remainingCount: number;
  onLoadMore: () => void;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  onReoptimize: (row: SavedPromptRow) => void;
  onRequestDelete: (id: string) => void;
  skeleton: React.ReactNode;
  emptyState: React.ReactNode;
}

/** "My Library" tab: search, mode pills, expandable saved-prompt rows, load-more. */
export function SavedPromptsTab({
  totalCount,
  searchQuery,
  onSearchChange,
  modeFilter,
  onModeFilterChange,
  loading,
  error,
  visibleRows,
  filteredCount,
  hasMore,
  remainingCount,
  onLoadMore,
  expandedId,
  onToggleExpand,
  onReoptimize,
  onRequestDelete,
  skeleton,
  emptyState,
}: SavedPromptsTabProps) {
  return (
    <>
      {/* Search */}
      <label className="relative mb-4 block">
        <span className="sr-only">Search saved prompts</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8a8a]"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search prompts…"
          autoComplete="off"
          className="w-full rounded-[12px] border border-[#252525] bg-[#0A0A0A] py-2.5 pl-10 pr-4 text-[14px] text-white outline-none placeholder:text-[#8a8a8a] focus:border-accent"
        />
      </label>

      {/* Mode filter pills */}
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by optimization mode"
      >
        {MODE_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onModeFilterChange(id)}
            aria-pressed={modeFilter === id}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              modeFilter === id
                ? 'border-accent bg-accent/20 text-[#ECECEC]'
                : 'border-[#2a2a2a] bg-[#0A0A0A] text-[#B0B0B0] hover:border-accent/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {loading ? (
        skeleton
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-center text-sm text-red-400">
          {error}
        </div>
      ) : totalCount === 0 ? (
        emptyState
      ) : filteredCount === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No prompts match your filters"
          description="Try a different search term or reset the mode filter."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {visibleRows.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <li
                  key={row.id}
                  className="rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 transition hover:border-[#3F3F46]"
                >
                  <button
                    type="button"
                    onClick={() => onToggleExpand(expanded ? null : row.id)}
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-[family-name:var(--font-space-grotesk),sans-serif] text-[15px] font-medium text-[#E7E6D9]">
                        {row.title}
                      </h2>
                      <p className="mt-1 truncate text-[13px] text-[#aaa]">
                        {previewText(row.original_prompt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          row.mode === 'better'
                            ? 'bg-accent/20 text-accent-text'
                            : row.mode === 'specific'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        {modeBadgeLabel(row.mode)}
                      </span>
                      <time
                        dateTime={row.created_at}
                        className="text-[11px] text-[#8a8a8a]"
                        title={new Date(row.created_at).toLocaleString()}
                      >
                        {formatTimestamp(row.created_at)}
                      </time>
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-[#8a8a8a]" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#8a8a8a]" aria-hidden />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-4 border-t border-[#252525] pt-4">
                      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-[11px] text-[#8a8a8a]">Original</p>
                          <p className="whitespace-pre-wrap text-sm text-[#B0B0B0]">
                            {row.original_prompt || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] text-[#8a8a8a]">Optimized</p>
                          <p className="whitespace-pre-wrap text-sm text-[#ECECEC]">
                            {row.optimized_prompt || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onReoptimize(row)}
                          className="inline-flex items-center gap-1.5 text-sm text-accent-text hover:underline"
                        >
                          <ArrowRight size={14} aria-hidden />
                          Re-optimize
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete(row.id)}
                          className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:underline"
                        >
                          <Trash2 size={14} aria-hidden />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Load more */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                className="rounded-[10px] border border-[#2a2a2a] bg-[#111] px-6 py-2.5 text-[13px] font-semibold text-[#ECECEC] transition-colors hover:border-[#3a3a3a] hover:bg-[#1a1a1a]"
              >
                Load more
                <span className="ml-2 text-[#8a8a8a]">
                  ({remainingCount} remaining)
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
