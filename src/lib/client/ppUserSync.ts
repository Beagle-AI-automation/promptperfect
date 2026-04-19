'use client';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

/** Serialize auth calls — concurrent getUser/getSession steal the GoTrue storage lock (Next/Turbopack). */
let authChain: Promise<unknown> = Promise.resolve();

function runAuthSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const result = authChain.then(() => fn()) as Promise<T>;
  authChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isAuthLockError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return /lock.*stolen|auth-token|released because another request/i.test(
    e.message,
  );
}

async function resolveAuthInternal(
  supabase: SupabaseClient,
): Promise<{ user: User | null; session: Session | null }> {
  const attempt = async (): Promise<{ user: User | null; session: Session | null }> => {
    let {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return { user, session: session ?? null };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.refresh_token) {
      const { error: refErr } = await supabase.auth.refreshSession();
      if (!refErr) {
        const second = await supabase.auth.getUser();
        if (!second.error && second.data.user) {
          const {
            data: { session: s2 },
          } = await supabase.auth.getSession();
          return { user: second.data.user, session: s2 ?? null };
        }
      }
    }

    return { user: null, session: session ?? null };
  };

  try {
    return await attempt();
  } catch (e) {
    if (isAuthLockError(e)) {
      await new Promise((r) => setTimeout(r, 100));
      return attempt();
    }
    throw e;
  }
}

/**
 * Validates the JWT with Supabase; if it fails, tries `refreshSession` once
 * (common when the access token expired but the refresh token is still valid).
 * Runs behind a global mutex so parallel callers do not race the auth storage lock.
 */
export async function resolveAuthUserWithRefresh(
  supabase: SupabaseClient,
): Promise<{ user: User | null }> {
  const { user } = await runAuthSerialized(() => resolveAuthInternal(supabase));
  return { user };
}

/** Same resolution as {@link resolveAuthUserWithRefresh} plus session for headers (single mutex entry). */
export async function resolveAuthUserAndSession(
  supabase: SupabaseClient,
): Promise<{ user: User | null; session: Session | null }> {
  return runAuthSerialized(() => resolveAuthInternal(supabase));
}

/**
 * Overwrite `pp_user.id` / `pp_user.email` from Supabase Auth when the session
 * is valid. Fixes stale ids (e.g. old `pp_users` row) that make Admin
 * `getUserById` return "User not found" for this project.
 */
export function applyAuthUserToPpUserStorage(user: User): void {
  if (typeof window === 'undefined') return;
  const email = user.email?.trim();
  if (!user.id || !email) return;

  let existing: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem('pp_user');
    if (raw) existing = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // ignore
  }

  const metaName =
    (typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '') ||
    (typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name.trim()
      : '') ||
    null;

  const prevName =
    typeof existing.name === 'string' ? existing.name.trim() : '';
  const merged = {
    id: user.id,
    email,
    name: prevName || metaName,
    provider:
      typeof existing.provider === 'string' && existing.provider
        ? existing.provider
        : 'gemini',
    model:
      typeof existing.model === 'string' && existing.model
        ? existing.model
        : 'gemini-2.0-flash',
  };

  localStorage.setItem('pp_user', JSON.stringify(merged));
}

/** Returns true if storage was updated (session user present). */
export async function syncPpUserFromAuthSession(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { user } = await resolveAuthUserWithRefresh(supabase);
  if (!user?.id || !user.email?.trim()) return false;
  applyAuthUserToPpUserStorage(user);
  return true;
}

/** Clear app login state and Supabase cookies so the next sign-in writes a fresh `pp_user`. */
export async function clearPromptPerfectLocalAuth(
  supabase: SupabaseClient | null,
): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pp_user');
  }
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* session storage lock or network — pp_user is already cleared */
    }
  }
}
