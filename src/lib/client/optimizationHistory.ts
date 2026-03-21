import { getSupabaseClient } from '@/lib/supabase';

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

export async function saveToHistory(params: {
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
}): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const session_id = getOrCreateSessionId();
  if (!session_id) return null;

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

    if (error || !data) return null;
    return data.id;
  } catch {
    // non-blocking
    return null;
  }
}
