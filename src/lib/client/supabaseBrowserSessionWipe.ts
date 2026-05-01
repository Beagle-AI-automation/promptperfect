'use client';

/**
 * Last-resort cleanup after `auth.signOut()` so we are not left with cookie or
 * legacy localStorage tokens (e.g. SSR client uses cookies; old builds used
 * localStorage). Surviving session tokens would let the client appear signed in again.
 */
export function wipeBrowserSupabaseSession(): void {
  if (typeof window === 'undefined') return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return;

  let projectRef: string;
  try {
    projectRef = new URL(url).hostname.split('.')[0] ?? '';
  } catch {
    return;
  }
  if (!projectRef) return;

  const prefix = `sb-${projectRef}`;

  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // swallow: storage quota or auth lock while wiping keys
  }

  try {
    const raw = document.cookie;
    if (!raw) return;
    const names = new Set<string>();
    for (const part of raw.split(';')) {
      const trimmed = part.trim();
      const eq = trimmed.indexOf('=');
      const name = (eq >= 0 ? trimmed.slice(0, eq) : trimmed).trim();
      if (name.startsWith(prefix)) names.add(name);
    }
    for (const name of names) {
      document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  } catch {
    // swallow: session wipe cleanup failed non-fatally
  }
}
