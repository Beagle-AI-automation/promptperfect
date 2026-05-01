'use client';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { clearNavProfileCache } from '@/lib/client/navProfileCache';
import { clearStatsBarCache } from '@/lib/client/statsBarCache';
import {
  readEnginePrefs,
  writeEnginePrefs,
  clearEnginePrefs,
} from '@/lib/client/enginePrefsStorage';
import { wipeBrowserSupabaseSession } from '@/lib/client/supabaseBrowserSessionWipe';

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
    const {
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
 * Persist only engine defaults (provider/model).
 * Preserves existing prefs when set so BYOK provider choice survives session refresh.
 */
export function persistEnginePrefsFromAuthUser(): void {
  const prev = readEnginePrefs() ?? {};
  const provider =
    typeof prev.provider === 'string' && prev.provider
      ? prev.provider
      : 'gemini';
  const model =
    typeof prev.model === 'string' && prev.model
      ? prev.model
      : 'gemini-2.0-flash';
  writeEnginePrefs({ provider, model });
}

/** Refresh persisted engine prefs after a validated Auth session (no identity in localStorage). */
export async function syncEnginePrefsFromAuthSession(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { user } = await resolveAuthUserWithRefresh(supabase);
  if (!user?.id || !user.email?.trim()) return false;
  persistEnginePrefsFromAuthUser();
  return true;
}

/** Clear Supabase session, engine prefs cache, and profile stats caches. */
export async function clearPromptPerfectLocalAuth(
  supabase: SupabaseClient | null,
): Promise<void> {
  if (supabase) {
    try {
      /** Default `global` revokes refresh token server-side and clears browser session. */
      await supabase.auth.signOut();
    } catch {
      // swallow: sign-out network/auth lock — fall through to local wipe
    }
  }

  wipeBrowserSupabaseSession();

  if (typeof window !== 'undefined') {
    try {
      clearEnginePrefs();
    } catch {
      // swallow: engine prefs clear failed (storage)
    }
    clearNavProfileCache();
    clearStatsBarCache();
  }
}
