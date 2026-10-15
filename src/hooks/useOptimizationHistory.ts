'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';
import {
  getLocalHistoryForSession,
  getOrCreateSessionId,
} from '@/lib/client/optimizationHistory';
import {
  mapLibraryRowToHistory,
  mergeHistoryLists,
  sortByNewest,
  type LibraryHistorySource,
  type OptimizationHistoryItem,
} from '@/lib/historyMerge';

const HISTORY_SELECT =
  'id,session_id,optimize_session_id,prompt_original,prompt_optimized,mode,explanation,created_at';

interface UseOptimizationHistoryOptions {
  /**
   * Required for signed-in users: history rows are keyed by account, not browser session.
   * Without this, everyone on the same device shares one `session_id` and histories clash.
   */
  userId?: string;
  /** Fallback when userId is absent: guest fingerprint or browser session id. */
  historySessionId?: string;
  refreshTrigger?: number;
  onDeleted?: (id: string) => void;
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch every library page (server returns bounded pages of 100).
 * Capped at 10 pages (1000 rows) as an abuse guard; beyond that the newest
 * rows still load first, so nothing visible is lost in practice.
 */
async function fetchAllLibrary(
  headers: Record<string, string>,
): Promise<LibraryHistorySource[]> {
  const out: LibraryHistorySource[] = [];
  let offset: number | null = 0;
  for (let page = 0; page < 10 && offset !== null; page += 1) {
    const json: {
      prompts?: LibraryHistorySource[];
      nextOffset?: number | null;
    } | null = await fetchJson(`/api/saved-prompts?limit=100&offset=${offset}`, headers);
    if (!json) break;
    out.push(...(json.prompts ?? []));
    offset = typeof json.nextOffset === 'number' ? json.nextOffset : null;
  }
  return out;
}

/**
 * Loads the optimizer history sidebar rows from up to three sources (account
 * API, legacy browser-session rows, library saves) plus the local fallback,
 * and deletes account rows via the API. Pure data layer — rendering stays in
 * the component.
 */
export function useOptimizationHistory({
  userId,
  historySessionId,
  refreshTrigger = 0,
  onDeleted,
}: UseOptimizationHistoryOptions) {
  const [rows, setRows] = useState<OptimizationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = userId?.trim();
    const browserSid = historySessionId?.trim() || getOrCreateSessionId() || '';
    const client = createSupabaseBrowserClient();

    if (uid) {
      setLoading(true);
      try {
        const headers = client ? await getPromptPerfectAuthHeaders(client) : null;
        const headerMap = headers ?? {};

        // 1. History rows properly linked to this account (user_id set).
        // 2. Older rows saved under this browser session (user_id was null before the bug-fix).
        // 3. Library saves — so history is never empty when the user has saved prompts.
        const [apiJson, sessionData, libraryJson] = await Promise.all([
          headers
            ? fetchJson<{ items?: OptimizationHistoryItem[] }>('/api/history', headerMap)
            : Promise.resolve(null),
          client && browserSid
            ? Promise.resolve(
                client
                  .from('pp_optimization_history')
                  .select(HISTORY_SELECT)
                  .eq('session_id', browserSid)
                  .order('created_at', { ascending: false })
                  .limit(50),
              )
                .then(({ data }) => (data as OptimizationHistoryItem[]) ?? [])
                .catch((): OptimizationHistoryItem[] => [])
            : Promise.resolve([] as OptimizationHistoryItem[]),
          headers
            ? fetchAllLibrary(headerMap)
            : Promise.resolve([] as LibraryHistorySource[]),
        ]);

        const merged = mergeHistoryLists(
          apiJson?.items ?? [],
          sessionData,
          libraryJson.map(mapLibraryRowToHistory),
          50,
        );
        setRows(merged);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Guest: session-scoped local + Supabase query.
    if (!browserSid) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const localRows = getLocalHistoryForSession(browserSid);
      if (!client) {
        setRows(sortByNewest(localRows, 20));
        return;
      }
      const { data, error } = await client
        .from('pp_optimization_history')
        .select(HISTORY_SELECT)
        .eq('session_id', browserSid)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const remote = (data as OptimizationHistoryItem[]) ?? [];
      setRows(sortByNewest([...remote, ...localRows], 20));
    } catch {
      setRows(sortByNewest(getLocalHistoryForSession(browserSid), 20));
    } finally {
      setLoading(false);
    }
  }, [historySessionId, userId]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      const uid = userId?.trim();
      if (!uid || deletingId) return false;
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      setDeletingId(itemId);
      setDeleteError(null);
      try {
        const headers = await getPromptPerfectAuthHeaders(client);
        if (!headers) {
          setDeleteError('Authentication error. Please refresh and try again.');
          return false;
        }
        const res = await fetch(`/api/history?id=${encodeURIComponent(itemId)}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setDeleteError(body.error ?? 'Failed to delete. Please try again.');
          return false;
        }
        onDeleted?.(itemId);
        await load();
        return true;
      } catch {
        setDeleteError('Network error. Please try again.');
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [userId, deletingId, load, onDeleted],
  );

  const dismissError = useCallback(() => {
    setDeleteError(null);
  }, []);

  return { rows, loading, deletingId, deleteError, reload: load, removeItem, dismissError };
}
