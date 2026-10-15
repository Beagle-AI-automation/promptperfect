import { getSupabaseClient } from '@/lib/client/supabase';
import {
  CHANGES_DELIMITER,
  EXPLANATION_DELIMITER,
  stripPromptScoreMarkers,
} from '@/lib/delimiter';

const SESSION_STORAGE_KEY = 'pp:optimization_session_id';
const LOCAL_HISTORY_KEY = 'pp:optimization_history_local';
const LOCAL_HISTORY_CAP = 100;

/** Parse full optimize API / stream text into optimized prompt (matches StreamingPromptOutput). */
export function optimizedTextFromFullCompletion(fullText: string): string {
  const explIdx = fullText.indexOf(EXPLANATION_DELIMITER);
  const before = explIdx !== -1 ? fullText.slice(0, explIdx) : fullText;
  return stripPromptScoreMarkers(before);
}

/** Parse explanation segment from full optimize stream/sync text. */
export function explanationTextFromFullCompletion(fullText: string): string {
  const explIdx = fullText.indexOf(EXPLANATION_DELIMITER);
  if (explIdx === -1) return '';
  const afterExpl = fullText.slice(explIdx + EXPLANATION_DELIMITER.length);
  const changesIdx = afterExpl.indexOf(CHANGES_DELIMITER);
  return (changesIdx !== -1 ? afterExpl.slice(0, changesIdx) : afterExpl).trim();
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY)?.trim();
    if (existing) return existing;

    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    localStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    // swallow: localStorage unavailable (quota / private mode) — caller gets an empty session id
    return '';
  }
}

export type LocalHistoryRow = {
  id: string;
  session_id: string;
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  created_at: string;
};

function readLocalHistoryRows(): LocalHistoryRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalHistoryRow[]) : [];
  } catch {
    // swallow: JSON.parse failed or localStorage unavailable — return empty history
    return [];
  }
}

function isQuotaError(e: unknown): boolean {
  if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
    return e.name === 'QuotaExceededError';
  }
  if (typeof e === 'object' && e !== null) {
    const rec = e as Record<string, unknown>;
    return rec.name === 'QuotaExceededError' || rec.code === 22 || rec.code === 1014;
  }
  return false;
}

/** Per-field cap so a single giant prompt can't blow the ~5MB localStorage quota. */
const MAX_FIELD_CHARS = 20000;

function truncateField(value: string): string {
  return value.length > MAX_FIELD_CHARS ? value.slice(0, MAX_FIELD_CHARS) : value;
}

function truncateRow<T extends { prompt_original: string; prompt_optimized: string; explanation: string }>(row: T): T {
  return {
    ...row,
    prompt_original: truncateField(row.prompt_original),
    prompt_optimized: truncateField(row.prompt_optimized),
    explanation: truncateField(row.explanation),
  };
}

function truncateUnknownRow(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row };
  for (const k of ['prompt_original', 'prompt_optimized', 'explanation'] as const) {
    const v = next[k];
    if (typeof v === 'string' && v.length > MAX_FIELD_CHARS) {
      next[k] = v.slice(0, MAX_FIELD_CHARS);
    }
  }
  return next;
}

function readRawRows(key: string): Array<Record<string, unknown>> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

/**
 * Quota-aware write with cross-key eviction. localStorage quota is per-origin,
 * so when the primary key can't be written we also prune our other big key
 * (history <-> library) oldest-first until the write fits. Never throws —
 * local persistence is best-effort.
 */
function writeRowsWithEviction(
  primaryKey: string,
  primaryRows: Array<{ prompt_original: string; prompt_optimized: string; explanation: string }>,
  secondaryKey: string,
): void {
  const primary = primaryRows.slice(0, LOCAL_HISTORY_CAP);
  try {
    localStorage.setItem(primaryKey, JSON.stringify(primary));
    return;
  } catch (e) {
    if (!isQuotaError(e)) return;
  }
  // 1) Shrink primary oldest-first, truncating fields under pressure.
  let candidate = primary.map(truncateRow);
  while (candidate.length > 1) {
    candidate = candidate.slice(0, Math.max(1, Math.ceil(candidate.length / 2)));
    try {
      localStorage.setItem(primaryKey, JSON.stringify(candidate));
      return;
    } catch (e) {
      if (!isQuotaError(e)) return;
    }
  }
  // 2) Primary is one truncated row and still doesn't fit: free per-origin
  // space by pruning the secondary key oldest-first, retrying primary each step.
  let secondary = readRawRows(secondaryKey);
  while (secondary.length > 0) {
    secondary = secondary.slice(0, Math.floor(secondary.length / 2)).map(truncateUnknownRow);
    try {
      localStorage.setItem(secondaryKey, JSON.stringify(secondary));
    } catch {
      // ignore — retry primary anyway; further pruning follows
    }
    try {
      localStorage.setItem(primaryKey, JSON.stringify(candidate));
      return;
    } catch (e) {
      if (!isQuotaError(e)) return;
    }
  }
  // 3) Last resort: drop the secondary key entirely, then store primary.
  try {
    localStorage.removeItem(secondaryKey);
    localStorage.removeItem(primaryKey);
    localStorage.setItem(primaryKey, JSON.stringify(candidate));
  } catch {
    // swallow: storage unavailable/full — persistence is best-effort
  }
}

function writeLocalHistoryRows(rows: LocalHistoryRow[]) {
  writeRowsWithEviction(LOCAL_HISTORY_KEY, rows, LOCAL_LIBRARY_KEY);
}

function saveToLocalHistory(
  params: {
    prompt_original: string;
    prompt_optimized: string;
    mode: string;
    explanation: string;
  },
  session_id: string,
): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `local-${crypto.randomUUID()}`
      : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const item: LocalHistoryRow = {
    id,
    session_id,
    prompt_original: truncateField(params.prompt_original),
    prompt_optimized: truncateField(params.prompt_optimized),
    mode: params.mode,
    explanation: truncateField(params.explanation),
    created_at: new Date().toISOString(),
  };
  try {
    const list = readLocalHistoryRows();
    list.unshift(item);
    writeLocalHistoryRows(list);
  } catch {
    // swallow: localStorage unavailable/full — history save is best-effort
  }
  return id;
}

/** Client-side fallback when Supabase insert fails or is unavailable. */
export function getLocalHistoryForSession(sessionId: string): LocalHistoryRow[] {
  return readLocalHistoryRows().filter((r) => r.session_id === sessionId);
}

/** All locally stored history rows, newest first (powers local-mode Library). */
export function getAllLocalHistory(): LocalHistoryRow[] {
  return readLocalHistoryRows();
}

/** Remove one local history row. Returns true when a row was removed. */
export function deleteLocalHistoryRow(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const rows = readLocalHistoryRows();
    const next = rows.filter((r) => r.id !== id);
    if (next.length === rows.length) return false;
    writeLocalHistoryRows(next);
    return true;
  } catch {
    // swallow: localStorage unavailable — nothing to delete
    return false;
  }
}

// ── Local library (saved prompts without a backend) ───────────────────────────

const LOCAL_LIBRARY_KEY = 'pp:library_saved_local';

export type LocalLibraryRow = LocalHistoryRow & {
  title: string;
  provider: string;
  /** History row this snapshot was saved from (null when saved ad-hoc). */
  history_id: string | null;
};

function readLocalLibraryRows(): LocalLibraryRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalLibraryRow[]) : [];
  } catch {
    // swallow: JSON.parse failed or localStorage unavailable
    return [];
  }
}

/** All locally saved library rows, newest first. */
export function getLocalLibrary(): LocalLibraryRow[] {
  return readLocalLibraryRows();
}

/** True when `historyId` is already in the local library. */
export function isInLocalLibrary(historyId: string): boolean {
  if (!historyId) return false;
  return readLocalLibraryRows().some((r) => r.history_id === historyId);
}

/** Snapshot a prompt into the local library. Returns the saved row id. */
export function saveToLocalLibrary(params: {
  title: string;
  prompt_original: string;
  prompt_optimized: string;
  explanation: string;
  mode: string;
  provider: string;
  session_id: string;
  history_id?: string | null;
}): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `local-saved-${crypto.randomUUID()}`
      : `local-saved-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const row: LocalLibraryRow = {
    id,
    session_id: params.session_id,
    prompt_original: truncateField(params.prompt_original),
    prompt_optimized: truncateField(params.prompt_optimized),
    mode: params.mode,
    explanation: truncateField(params.explanation),
    title: params.title,
    provider: params.provider,
    history_id: params.history_id ?? null,
    created_at: new Date().toISOString(),
  };
  const list = readLocalLibraryRows();
  list.unshift(row);
  writeRowsWithEviction(LOCAL_LIBRARY_KEY, list, LOCAL_HISTORY_KEY);
  return id;
}

/** Remove one local library row. Returns true when a row was removed. */
export function deleteLocalLibraryRow(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const rows = readLocalLibraryRows();
    const next = rows.filter((r) => r.id !== id);
    if (next.length === rows.length) return false;
    localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(next));
    return true;
  } catch {
    // swallow: localStorage unavailable — nothing to delete
    return false;
  }
}

export async function saveToHistory(params: {
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  /**
   * Scope rows to this session id. Guests should pass `getGuestId()` so history can be
   * merged into the signed-in session via `/api/auth/claim-guest-history`.
   */
  sessionId?: string;
  /** When signed in, links the row to the account for profile stats. */
  userId?: string;
  provider?: string;
  /** Same id sent to `/api/optimize` as `session_id` — matches `optimization_logs.session_id` for feedback. */
  optimizeSessionId?: string;
}): Promise<string | null> {
  const session_id = params.sessionId?.trim() || getOrCreateSessionId();
  if (!session_id) return null;

  const client = getSupabaseClient();
  if (client) {
    try {
      const row: Record<string, unknown> = {
        session_id,
        prompt_original: params.prompt_original,
        prompt_optimized: params.prompt_optimized,
        mode: params.mode,
        explanation: params.explanation,
      };
      if (params.userId) row.user_id = params.userId;
      if (params.provider) row.provider = params.provider;
      if (params.optimizeSessionId) row.optimize_session_id = params.optimizeSessionId;

      const { data, error } = await client
        .from('pp_optimization_history')
        .insert(row)
        .select('id')
        .single();

      if (!error && data?.id) {
        return data.id;
      }
      if (
        error &&
        typeof window !== 'undefined' &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.warn(
          '[PromptPerfect] History save to Supabase failed:',
          error.message,
        );
      }

      // For authenticated users, fall back to the server route which ensures
      // the pp_users row exists and writes all fields (including provider).
      if (params.userId && typeof window !== 'undefined') {
        try {
          const resp = await fetch('/api/save-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              session_id,
              prompt_original: params.prompt_original,
              prompt_optimized: params.prompt_optimized,
              mode: params.mode,
              explanation: params.explanation,
              provider: params.provider ?? null,
              optimize_session_id: params.optimizeSessionId ?? null,
            }),
          });
          const json = (await resp.json().catch(() => ({}))) as { id?: string };
          if (resp.ok && json.id) return json.id;
        } catch {
          // swallow: server fallback unavailable, continue to local storage
        }
      }
    } catch (e) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn('[PromptPerfect] History save error:', e);
      }
    }
  }

  if (typeof window === 'undefined') return null;
  return saveToLocalHistory(params, session_id);
}
