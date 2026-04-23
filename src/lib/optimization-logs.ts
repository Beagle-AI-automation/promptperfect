/**
 * DB constraint `optimization_logs_mode_check` allows only better | specific | cot.
 * Map app modes (developer, research, …) to a safe value for inserts/updates.
 */
export function normalizeModeForDb(mode: string): 'better' | 'specific' | 'cot' {
  const m = mode.toLowerCase();
  if (m === 'specific' || m === 'cot') return m;
  return 'better';
}

const SCORE_REGEX = /---SCORE---(\d{1,3})(?:---)?/;

/** Parse LLM quality score (1–100) from model output, if present. */
export function parsePromptScore(text: string): number | null {
  const m = text.match(SCORE_REGEX);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1 || n > 100) return null;
  return n;
}
