/** Default max free optimizations for anonymous guests before signup is required. */
const DEFAULT_GUEST_TOKEN_LIMIT = 5;

/**
 * Resolve the guest limit, allowing a local-dev override via
 * `NEXT_PUBLIC_GUEST_TOKEN_LIMIT`. Falls back to the product default (5).
 */
function resolveGuestLimit(): number {
  const raw = process.env.NEXT_PUBLIC_GUEST_TOKEN_LIMIT;
  const n = raw != null && raw !== '' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_GUEST_TOKEN_LIMIT;
}

import { isUnlimitedMode } from './localMode';

/** Max free optimizations for anonymous guests before signup is required. */
export const GUEST_TOKEN_LIMIT = resolveGuestLimit();
/** Alias for UI and API routes that imported `GUEST_LIMIT` historically. */
export const GUEST_LIMIT = GUEST_TOKEN_LIMIT;

/**
 * Canonical guest-id format: UUIDs (crypto.randomUUID) or short alphanumeric
 * identifiers (`guest-…` legacy), 4–80 chars. Use in every API route that
 * accepts a guestId so validation is uniform and guessing is bounded.
 */
const GUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{4,80}$/;

/** True when `guestId` matches the canonical format. */
export function isValidGuestId(guestId: unknown): guestId is string {
  return typeof guestId === 'string' && GUEST_ID_PATTERN.test(guestId);
}

/**
 * Validate a guestId from an untrusted request body. Returns the trimmed id,
 * or `null` when missing/malformed (caller responds 400).
 */
export function assertGuestId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return isValidGuestId(id) ? id : null;
}

const GUEST_ID_KEY = 'pp_guest_id';
const GUEST_TOKENS_KEY = 'pp_guest_tokens_used';
const LEGACY_GUEST_COUNT_KEY = 'pp_guest_count';

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return localStorage;
}

/**
 * Stable guest id for demo usage tracking (e.g. `guest-usage` `guestId`).
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
 * Decrement stored guest usage by `delta` (default 1), flooring at 0.
 * Used to refund the optimistic reservation when an optimization fails,
 * so failed attempts don't burn free quota.
 */
export function decrementGuestCount(delta: number = 1, storage?: Storage): number {
  const next = Math.max(
    0,
    getGuestCount(storage) - Math.max(0, Math.floor(delta)),
  );
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
  // Unlimited local-dev mode: the quota gate is fully disabled.
  if (isUnlimitedMode()) return false;
  const used = tokensUsed !== undefined ? tokensUsed : getGuestCount();
  return used >= limit;
}
