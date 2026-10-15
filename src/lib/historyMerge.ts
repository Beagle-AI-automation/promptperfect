/**
 * Pure history-list logic extracted from `HistoryPanel`: merging the three
 * sources (account rows, legacy session rows, library saves), newest-first
 * sorting, and display formatting. No I/O — fully unit-tested.
 */

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

/** Library rows mapped into history shape (`lib-` prefix marks non-deletables). */
export interface LibraryHistorySource {
  id: string;
  title: string;
  original_prompt: string;
  optimized_prompt: string;
  explanation: string;
  mode: string;
  created_at: string;
}

export function mapLibraryRowToHistory(p: LibraryHistorySource): OptimizationHistoryItem {
  return {
    id: `lib-${p.id}`,
    session_id: '',
    optimize_session_id: null,
    prompt_original: p.original_prompt,
    prompt_optimized: p.optimized_prompt,
    mode: p.mode,
    explanation: p.explanation ?? '',
    created_at: p.created_at,
  };
}

function promptKey(row: Pick<OptimizationHistoryItem, 'prompt_original'>): string {
  return row.prompt_original.trim().slice(0, 200);
}

/** Newest-first sort with a result cap. Invalid dates sink to the bottom. */
export function sortByNewest<T extends Pick<OptimizationHistoryItem, 'created_at'>>(
  rows: T[],
  limit: number,
): T[] {
  return [...rows]
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      const na = Number.isNaN(ta) ? -Infinity : ta;
      const nb = Number.isNaN(tb) ? -Infinity : tb;
      return nb - na;
    })
    .slice(0, Math.max(0, limit));
}

/**
 * Merge account + legacy session rows first (they carry delete buttons),
 * then library saves only when no matching history entry exists — a prompt
 * that was both optimized and saved must not appear twice.
 */
export function mergeHistoryLists(
  apiRows: OptimizationHistoryItem[],
  sessionRows: OptimizationHistoryItem[],
  libraryRows: OptimizationHistoryItem[],
  limit: number,
): OptimizationHistoryItem[] {
  const seenIds = new Set<string>();
  const seenPrompts = new Set<string>();
  const merged: OptimizationHistoryItem[] = [];

  for (const row of [...apiRows, ...sessionRows]) {
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    const key = promptKey(row);
    if (key) seenPrompts.add(key);
    merged.push(row);
  }

  for (const row of libraryRows) {
    if (seenIds.has(row.id)) continue;
    const key = promptKey(row);
    if (key && seenPrompts.has(key)) continue;
    seenIds.add(row.id);
    if (key) seenPrompts.add(key);
    merged.push(row);
  }

  return sortByNewest(merged, limit);
}

/** Short "Dec 5, 14:30" stamp; returns raw input when unparseable. */
export function formatHistoryTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    // swallow: invalid ISO string or Intl unavailable — return raw value
    return iso;
  }
}

/** One-line preview for list rows. */
export function previewPrompt(text: string, max = 60): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
