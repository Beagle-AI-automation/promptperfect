/**
 * Pure helpers + row types for the Prompt Library (`/library`).
 * Extracted from `src/app/library/page.tsx` — no behavior changes.
 */

import { formatDistanceToNow } from 'date-fns';
import type { LocalLibraryRow } from '@/lib/client/optimizationHistory';

export const LIBRARY_PAGE_SIZE = 25;
const PREVIEW_LEN = 120;

export interface SavedPromptRow {
  id: string;
  user_id: string;
  title: string;
  original_prompt: string;
  optimized_prompt: string;
  explanation: string;
  mode: string;
  provider: string;
  created_at: string;
}

export type LibraryModeFilter = 'all' | 'better' | 'specific' | 'cot';

/** Narrow an unknown row list to renderable saved-prompt rows. */
export function isSavedPromptRow(v: unknown): v is SavedPromptRow {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.original_prompt === 'string' &&
    typeof r.optimized_prompt === 'string'
  );
}

export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const ageMs = Date.now() - d.getTime();
    if (ageMs < 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(d, { addSuffix: true });
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
  } catch {
    // swallow: invalid ISO string or Intl unavailable — return raw value
    return iso;
  }
}

export function previewText(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= PREVIEW_LEN) return t || '—';
  return `${t.slice(0, PREVIEW_LEN)}…`;
}

export function rowMatchesSearch(row: SavedPromptRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const title = (row.title ?? '').toLowerCase();
  const orig = (row.original_prompt ?? '').toLowerCase();
  const opt = (row.optimized_prompt ?? '').toLowerCase();
  return title.includes(q) || orig.includes(q) || opt.includes(q);
}

export function rowMatchesModeFilter(row: SavedPromptRow, filter: LibraryModeFilter): boolean {
  if (filter === 'all') return true;
  const m = (row.mode ?? '').trim().toLowerCase();
  if (filter === 'better') return m === 'better';
  if (filter === 'specific') return m === 'specific';
  if (filter === 'cot') return m === 'cot' || m === 'chain-of-thought' || m === 'chain_of_thought';
  return true;
}

export function modeBadgeLabel(mode: string): string {
  const m = mode.trim().toLowerCase();
  if (m === 'cot' || m === 'chain-of-thought' || m === 'chain_of_thought') return 'CoT';
  return mode;
}

/** Map localStorage library rows to the server row shape for unified rendering. */
export function mapLocalLibraryRows(rows: LocalLibraryRow[]): SavedPromptRow[] {
  return rows.map((r) => ({
    id: r.id,
    user_id: 'local',
    title: r.title,
    original_prompt: r.prompt_original,
    optimized_prompt: r.prompt_optimized,
    explanation: r.explanation,
    mode: r.mode,
    provider: r.provider,
    created_at: r.created_at,
  }));
}
