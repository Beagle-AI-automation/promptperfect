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
    return [];
  }
}

function writeLocalHistoryRows(rows: LocalHistoryRow[]) {
  localStorage.setItem(
    LOCAL_HISTORY_KEY,
    JSON.stringify(rows.slice(0, LOCAL_HISTORY_CAP)),
  );
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
    prompt_original: params.prompt_original,
    prompt_optimized: params.prompt_optimized,
    mode: params.mode,
    explanation: params.explanation,
    created_at: new Date().toISOString(),
  };
  const list = readLocalHistoryRows();
  list.unshift(item);
  writeLocalHistoryRows(list);
  return id;
}

/** Client-side fallback when Supabase insert fails or is unavailable. */
export function getLocalHistoryForSession(sessionId: string): LocalHistoryRow[] {
  return readLocalHistoryRows().filter((r) => r.session_id === sessionId);
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
  const session_id = getOrCreateSessionId();
  if (!session_id) return null;

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('pp_optimization_history')
        .insert({
          session_id,
          prompt_original: params.prompt_original,
          prompt_optimized: params.prompt_optimized,
          mode: params.mode,
          explanation: params.explanation,
        })
        .select('id')
        .single();

      if (!error && data?.id) {
        return data.id;
      }
      if (error && typeof window !== 'undefined') {
        console.warn(
          '[PromptPerfect] History save to Supabase failed:',
          error.message,
        );
      }
    } catch (e) {
      if (typeof window !== 'undefined') {
        console.warn('[PromptPerfect] History save error:', e);
      }
    }
  }

  if (typeof window === 'undefined') return null;
  return saveToLocalHistory(params, session_id);
}
