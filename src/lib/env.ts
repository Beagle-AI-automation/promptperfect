/**
 * Shared environment helpers (no framework imports — safe for server,
 * browser, edge, and tests). Supabase URL normalization lives here so the
 * server and browser client factories share one definition of "configured".
 */

/** Trim and strip optional surrounding quotes from .env values (common mis-copy). */
export function normalizeEnvValue(value: string | undefined): string {
  if (!value) return '';
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * True for empty values and for the `your-project` placeholder shipped in
 * `.env.example` — i.e. Supabase was never really configured. Treat these as
 * "no backend" so callers take their local fallbacks immediately instead of
 * issuing doomed network requests against a dead domain.
 */
export function isPlaceholderSupabaseUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const v = url.trim().toLowerCase().replace(/\/$/, '');
  if (!v) return true;
  return v.includes('your-project') || v.includes('example.com');
}

/**
 * Normalize a Supabase URL env value: trim, strip quotes/trailing slash.
 * Returns `null` when unconfigured or a placeholder.
 */
export function normalizeSupabaseUrl(
  value: string | undefined | null,
): string | null {
  if (!value) return null;
  const v = normalizeEnvValue(value).replace(/\/$/, '');
  if (isPlaceholderSupabaseUrl(v)) return null;
  return v;
}
