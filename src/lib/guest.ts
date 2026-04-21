/** Max free optimizations for anonymous guests before signup is required. */
export const GUEST_TOKEN_LIMIT = 5;
/** Alias for UI and API routes that imported `GUEST_LIMIT` historically. */
export const GUEST_LIMIT = GUEST_TOKEN_LIMIT;

const GUEST_ID_KEY = 'pp_guest_id';
const GUEST_TOKENS_KEY = 'pp_guest_tokens_used';
const LEGACY_GUEST_COUNT_KEY = 'pp_guest_count';

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return localStorage;
}

/**
 * Stable guest id for demo usage tracking (e.g. `record-demo-usage` `sessionId`).
 */
export function getGuestId(storage?: Storage): string {
  const s = getStorage(storage);
  if (!s) return '';
  let id = s.getItem(GUEST_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    s.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

/** Existing guest fingerprint only (does not create an id). Used when claiming history after login. */
export function getStoredGuestId(): string {
  const s = getStorage();
  if (!s) return '';
  return s.getItem(GUEST_ID_KEY)?.trim() ?? '';
}

/** Reported demo tokens used for the guest (client-side cache; server is source of truth). */
export function getGuestCount(storage?: Storage): number {
  const s = getStorage(storage);
  if (!s) return 0;
  if (s.getItem(GUEST_TOKENS_KEY) == null) {
    const legacy = s.getItem(LEGACY_GUEST_COUNT_KEY);
    if (legacy != null) s.setItem(GUEST_TOKENS_KEY, legacy);
  }
  const v = s.getItem(GUEST_TOKENS_KEY);
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function setGuestCount(count: number, storage?: Storage): void {
  const s = getStorage(storage);
  if (!s) return;
  s.setItem(GUEST_TOKENS_KEY, String(Math.max(0, Math.floor(count))));
}

/** Clear guest id and usage from storage (e.g. after migrating guest to a signed-in user). */
export function clearGuestSession(storage?: Storage): void {
  const s = getStorage(storage);
  if (!s) return;
  s.removeItem(GUEST_ID_KEY);
  s.removeItem(GUEST_TOKENS_KEY);
  s.removeItem(LEGACY_GUEST_COUNT_KEY);
}

/** @deprecated Prefer `clearGuestSession`; kept for claim-guest-history / profile helpers. */
export function clearGuestLocalStorage(storage?: Storage): void {
  clearGuestSession(storage);
}

/** Max free optimizations for an anonymous guest (matches product copy). */
export function getGuestLimit(): number {
  return GUEST_TOKEN_LIMIT;
}

/**
 * Increment stored guest usage by `delta` (default 1). Returns the new total.
 */
export function incrementGuestCount(delta: number = 1, storage?: Storage): number {
  const next = getGuestCount(storage) + Math.max(0, Math.floor(delta));
  setGuestCount(next, storage);
  return next;
}

/**
 * When `tokensUsed` is omitted, uses the value from `getGuestCount()`.
 */
export function isGuestLimitReached(
  tokensUsed?: number,
  limit: number = GUEST_TOKEN_LIMIT,
): boolean {
  const used = tokensUsed !== undefined ? tokensUsed : getGuestCount();
  return used >= limit;
}
