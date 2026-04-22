/**
 * Last-known profile snippet for the header account menu so the avatar does not
 * disappear when navigating (e.g. /app → /profile → /app) before /api/profile returns.
 */

const STORAGE_KEY = 'pp:nav_profile_v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const NAV_PROFILE_UPDATED_EVENT = 'pp:nav-profile-updated' as const;

export type NavProfileCachedPayload = {
  userId: string;
  savedAt: number;
  avatarUrl: string | null;
  displayName: string | null;
};

export function readNavProfileCache(
  userId: string | null | undefined,
): NavProfileCachedPayload | null {
  if (typeof window === 'undefined' || !userId?.trim()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NavProfileCachedPayload;
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

export function writeNavProfileCache(
  userId: string,
  payload: Omit<NavProfileCachedPayload, 'userId' | 'savedAt'>,
): void {
  if (typeof window === 'undefined' || !userId.trim()) return;
  try {
    const full: NavProfileCachedPayload = {
      ...payload,
      userId: userId.trim(),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    /* quota / private mode */
  }
}

export function clearNavProfileCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
