import { getGuestId } from '@/lib/guest';
import { getSupabaseClient } from '@/lib/client/supabase';

const PP_USER_KEY = 'pp_user';

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

/**
 * Session key for `pp_optimization_history.session_id`.
 * Signed-in users: stable `user.id`. Guests: same id as `pp_guest_id` so signup migration can match rows.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  try {
    const raw = localStorage.getItem(PP_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw) as { id?: string };
      if (typeof u?.id === 'string' && u.id.trim()) return u.id.trim();
    }
  } catch {
    // fall through
  }

  return getGuestId();
}

export async function saveToHistory(params: {
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
  provider?: string;
}): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const session_id = getOrCreateSessionId();
  if (!session_id) return null;

  let user_id: string | null = null;
  try {
    const raw = localStorage.getItem(PP_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw) as { id?: string };
      if (typeof u?.id === 'string' && u.id.trim()) user_id = u.id.trim();
    }
  } catch {
    user_id = null;
  }

  const row: Record<string, unknown> = {
    session_id,
    prompt_original: params.prompt_original,
    prompt_optimized: params.prompt_optimized,
    mode: params.mode,
    explanation: params.explanation,
  };
  if (user_id) row.user_id = user_id;
  if (params.provider) row.provider = params.provider;

  try {
    const { data, error } = await client
      .from('pp_optimization_history')
      .insert(row)
      .select('id')
      .single();

    if (error || !data) return null;
    return data.id;
  } catch {
    // non-blocking
    return null;
  }
}
