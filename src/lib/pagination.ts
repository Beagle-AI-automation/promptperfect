/**
 * Bounded list pagination for API routes.
 *
 * Offset-based (`?limit=&offset=`) with a deterministic order
 * (`created_at DESC, id DESC`). Keyset cursors were considered, but Supabase
 * `.or()` filters mangle ISO timestamps (colons/commas need fragile
 * escaping), while library tables are low-write — offsets are correct here
 * and far less error-prone. Every page is bounded; `total` lets the UI show
 * real counts.
 */

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 100;

/** Parse `limit`, clamped to `[1, MAX_PAGE_LIMIT]`. */
export function parseLimit(raw: string | null, fallback = DEFAULT_PAGE_LIMIT): number {
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(n)));
}

/** Parse `offset`, floored at 0. */
export function parseOffset(raw: string | null): number {
  if (raw == null || raw.trim() === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/** Next offset, or `null` when the list is exhausted. */
export function nextOffset(offset: number, limit: number, total: number): number | null {
  const next = offset + limit;
  return next < total ? next : null;
}
