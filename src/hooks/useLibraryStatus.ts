'use client';

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';
import { isInLocalLibrary } from '@/lib/client/optimizationHistory';
import { isUnlimitedMode } from '@/lib/localMode';

const UUID_RE = /^[\da-f-]{36}$/i;

/**
 * Whether a history row is already saved in the library.
 *
 * Returns a `useState`-like tuple. Value is `null` when unknown (signed
 * out, or no row selected) so callers hide save-state UI, and `false` while
 * the check fails. The setter stays exposed for the optimistic "just saved"
 * update. Extracted from the `/app` workspace page — the single owner of
 * this query.
 *
 * Sync cases (signed out, bad row id, local unlimited mode) resolve during
 * render as derived state; only the status-API check uses an effect.
 */
export function useLibraryStatus(
  userId: string | null | undefined,
  historyId: string | null,
): [boolean | null, Dispatch<SetStateAction<boolean | null>>] {
  const [fetched, setFetched] = useState<boolean | null>(null);

  // Derived during render (SSR-safe: env read + guarded localStorage read),
  // memoized so the local-library read runs only when its inputs change.
  // `undefined` means the async fetch below owns the value.
  const syncValue = useMemo<boolean | null | undefined>(() => {
    if (!userId && isUnlimitedMode()) {
      return historyId ? isInLocalLibrary(historyId) : null;
    }
    if (!userId || !historyId || !UUID_RE.test(historyId)) return null;
    return undefined;
  }, [userId, historyId]);

  useEffect(() => {
    if (!userId || !historyId || !UUID_RE.test(historyId)) return;
    let cancelled = false;
    void (async () => {
      const client = createSupabaseBrowserClient();
      if (!client) {
        if (!cancelled) setFetched(false);
        return;
      }
      const headers = await getPromptPerfectAuthHeaders(client);
      if (!headers) {
        if (!cancelled) setFetched(false);
        return;
      }
      try {
        const r = await fetch(
          `/api/saved-prompts/status?history_id=${encodeURIComponent(historyId)}`,
          { headers },
        );
        const j = (await r.json().catch(() => ({}))) as { saved?: boolean };
        if (!cancelled) setFetched(!!j.saved);
      } catch {
        if (!cancelled) setFetched(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, historyId]);

  return [syncValue ?? fetched, setFetched];
}
