'use client';

import { Bookmark, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

/** Pulsing placeholder rows while saved prompts load. */
export function LibrarySkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Loading saved prompts">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded bg-[#252525]" />
              <div className="h-3 w-4/5 rounded bg-[#1e1e1e]" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="h-5 w-12 rounded bg-[#252525]" />
              <div className="h-3 w-16 rounded bg-[#1e1e1e]" />
              <div className="h-4 w-4 rounded bg-[#1e1e1e]" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LibraryEmptyState({
  message,
  description,
  children,
}: {
  message: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center rounded-2xl border border-dashed border-[#2a2a2a] bg-gradient-to-b from-white/[0.03] to-transparent px-8 py-20 text-center"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#252525] bg-[#111]">
        <Bookmark className="h-6 w-6 text-accent-text" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="font-[family-name:var(--font-space-grotesk),sans-serif] text-[17px] font-semibold text-[#E7E6D9]">
        {message}
      </p>
      {description && (
        <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[#8a8a8a]">
          {description}
        </p>
      )}
      {children ? (
        <div className="mt-8 flex flex-col items-center gap-3">{children}</div>
      ) : null}
    </div>
  );
}

export function DeleteConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#0e0e0e] p-6 shadow-2xl">
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
          <Trash2 className="h-5 w-5 text-red-400" aria-hidden />
        </div>
        <h2
          id="delete-modal-title"
          className="mt-3 font-[family-name:var(--font-space-grotesk),sans-serif] text-[16px] font-semibold text-[#E7E6D9]"
        >
          Delete saved prompt?
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#8a8a8a]">
          This will permanently remove the prompt from your library. This action cannot be undone.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[10px] border border-[#2a2a2a] bg-[#111] px-4 py-2.5 text-[13px] font-semibold text-[#ECECEC] transition-colors hover:border-[#3a3a3a] hover:bg-[#1a1a1a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-[10px] border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-[13px] font-semibold text-red-400 transition-colors hover:bg-red-500/25"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
