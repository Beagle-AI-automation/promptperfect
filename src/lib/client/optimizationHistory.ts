import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';

const SESSION_STORAGE_KEY = 'pp:optimization_session_id';

const EXPLANATION_DELIMITER = '---EXPLANATION---';
const CHANGES_DELIMITER = '---CHANGES---';
const SCORE_PATTERN = /---SCORE---(\d{1,3})---/;

/** Parse full optimize API / stream text into optimized prompt (matches StreamingPromptOutput). */
export function optimizedTextFromFullCompletion(fullText: string): string {
  const explIdx = fullText.indexOf(EXPLANATION_DELIMITER);
  const before = explIdx !== -1 ? fullText.slice(0, explIdx) : fullText;
  return before.replace(SCORE_PATTERN, '').trim();
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

function isMissingColumnError(message: string): boolean {
  return /optimize_session_id|provider|schema cache|could not find|column.*does not exist|PGRST204/i.test(
    message,
  );
}

function logHistoryDev(message: string, detail?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[saveToHistory] ${message}`, detail ?? '');
  }
}

async function insertHistoryRow(
  client: ReturnType<typeof createSupabaseBrowserClient>,
  row: Record<string, unknown>,
): Promise<string | null> {
  if (!client) return null;

  const runInsert = async (payload: Record<string, unknown>) => {
    const { data, error } = await client
      .from('pp_optimization_history')
      .insert(payload)
      .select('id');

    if (error) return { error: error.message, id: null as string | null };
    const id = Array.isArray(data) && data[0] && typeof data[0].id === 'string'
      ? data[0].id
      : null;
    return { error: null as string | null, id };
  };

  let payload: Record<string, unknown> = { ...row };
  let result = await runInsert(payload);

  if (result.error && isMissingColumnError(result.error) && 'optimize_session_id' in payload) {
    logHistoryDev('retry without optimize_session_id', result.error);
    const { optimize_session_id: _o, ...rest } = payload;
    payload = rest;
    result = await runInsert(payload);
  }

  if (result.error && isMissingColumnError(result.error) && 'provider' in payload) {
    logHistoryDev('retry without provider', result.error);
    const { provider: _p, ...rest } = payload;
    payload = rest;
    result = await runInsert(payload);
  }

  if (result.error) {
    logHistoryDev('insert failed', result.error);
    return null;
  }
  return result.id;
}

async function saveHistoryViaApi(params: {
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  session_id: string;
  optimize_session_id?: string;
  provider?: string;
}): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const client = createSupabaseBrowserClient();
  if (!client) return null;
  try {
    const headers = await getPromptPerfectAuthHeaders(client);
    if (!headers) return null;
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
    };
    if (!res.ok || !data.id) {
      logHistoryDev('API fallback failed', data.error ?? String(res.status));
      return null;
    }
    return data.id;
  } catch (e) {
    logHistoryDev('API fallback threw', e instanceof Error ? e.message : String(e));
    return null;
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
  if (typeof window === 'undefined') return null;
  const client = createSupabaseBrowserClient();
  if (!client) return null;

  const session_id =
    params.sessionId?.trim() || getOrCreateSessionId();
  if (!session_id) return null;

  const row: Record<string, unknown> = {
    session_id,
    prompt_original: params.prompt_original,
    prompt_optimized: params.prompt_optimized,
    mode: params.mode,
    explanation: params.explanation,
  };
  if (params.userId?.trim()) row.user_id = params.userId.trim();
  if (params.provider?.trim()) row.provider = params.provider.trim();
  if (params.optimizeSessionId?.trim()) {
    row.optimize_session_id = params.optimizeSessionId.trim();
  }

  let id = await insertHistoryRow(client, row);

  if (!id && params.userId?.trim()) {
    id = await saveHistoryViaApi({
      prompt_original: params.prompt_original,
      prompt_optimized: params.prompt_optimized,
      mode: params.mode,
      explanation: params.explanation,
      session_id,
      ...(params.optimizeSessionId?.trim()
        ? { optimize_session_id: params.optimizeSessionId.trim() }
        : {}),
      ...(params.provider?.trim() ? { provider: params.provider.trim() } : {}),
    });
  }

  return id;
}
