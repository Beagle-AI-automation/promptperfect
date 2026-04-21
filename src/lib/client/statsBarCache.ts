/**
 * Persists last-known /api/stats snapshot per signed-in user so the optimizer bar
 * does not flash zeros when navigating away (Profile, Library) and returning to /app.
 */

const STORAGE_KEY = 'pp:stats_bar_v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type StatsBarCachedPayload = {
  userId: string;
  savedAt: number;
  total: number;
  thumbsUp: number;
  thumbsDown: number;
  avgScore: number | null;
  byMode: Record<string, number>;
  byProvider: Record<string, number>;
};

export function readStatsBarCache(
  userId: string | null | undefined,
): StatsBarCachedPayload | null {
  if (typeof window === 'undefined' || !userId?.trim()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StatsBarCachedPayload;
    if (parsed.userId !== userId.trim()) return null;
    if (
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > MAX_AGE_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearStatsBarCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function writeStatsBarCache(
  userId: string,
  payload: Omit<StatsBarCachedPayload, 'userId' | 'savedAt'>,
): void {
  if (typeof window === 'undefined' || !userId.trim()) return;
  try {
    const full: StatsBarCachedPayload = {
      ...payload,
      userId: userId.trim(),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    /* quota / private mode */
  }
}
