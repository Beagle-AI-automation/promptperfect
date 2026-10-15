'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';
import { isUnlimitedMode } from '@/lib/localMode';
import {
  deleteLocalLibraryRow,
  getLocalLibrary,
  isInLocalLibrary,
  saveToLocalLibrary,
} from '@/lib/client/optimizationHistory';
import {
  PROMPT_TEMPLATES,
  type PromptTemplate,
  type TemplateCategory,
} from '@/lib/promptTemplates';
import {
  buildAppUserFromSupabaseUser,
  readEnginePrefs,
} from '@/lib/client/enginePrefsStorage';
import { resolveAuthUserAndSession } from '@/lib/client/ppUserSync';
import type { AppUser } from '@/lib/types';
import {
  LIBRARY_PAGE_SIZE,
  isSavedPromptRow,
  mapLocalLibraryRows,
  rowMatchesModeFilter,
  rowMatchesSearch,
  type LibraryModeFilter,
  type SavedPromptRow,
} from '@/lib/library';

export const REOPTIMIZE_SESSION_KEY = 'pp_reoptimize';

export type LibraryTab = 'mine' | 'templates';

export interface SavedLibrary {
  mounted: boolean;
  authReady: boolean;
  user: AppUser | null;
  rows: SavedPromptRow[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  modeFilter: LibraryModeFilter;
  setModeFilter: (f: LibraryModeFilter) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  visibleRows: SavedPromptRow[];
  filteredCount: number;
  hasMore: boolean;
  loadMore: () => void;
  confirmDelete: (id: string) => Promise<void>;
  reoptimize: (row: SavedPromptRow) => void;
  tab: LibraryTab;
  setTab: (t: LibraryTab) => void;
  tplCategory: TemplateCategory | 'All';
  setTplCategory: (c: TemplateCategory | 'All') => void;
  tplExpandedId: string | null;
  setTplExpandedId: (id: string | null) => void;
  filteredTemplates: PromptTemplate[];
  templateCountByCategory: Map<string, number>;
  tplSavingId: string | null;
  tplError: string | null;
  isTplSaved: (id: string) => boolean;
  useTemplate: (tpl: PromptTemplate) => void;
  saveTemplate: (tpl: PromptTemplate) => void;
}

function stashReoptimizeDraft(payload: { text: string; mode: string; autoOptimize: boolean }): void {
  try {
    sessionStorage.setItem(REOPTIMIZE_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // swallow: quota / private mode blocks draft storage
  }
}

/**
 * Data + interaction layer for the `/library` page: auth, saved-prompt
 * loading/deletion, search/mode filters, pagination, template forking and
 * template saves (server + local mode). Extracted from
 * `src/app/library/page.tsx` — behavior preserved verbatim.
 */
export function useSavedLibrary(): SavedLibrary {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [rows, setRows] = useState<SavedPromptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState('');
  const [modeFilter, setModeFilterState] = useState<LibraryModeFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const [tab, setTab] = useState<LibraryTab>('mine');
  const [tplCategory, setTplCategory] = useState<TemplateCategory | 'All'>('All');
  const [tplExpandedId, setTplExpandedId] = useState<string | null>(null);
  const [savedTplIds, setSavedTplIds] = useState<Set<string>>(new Set());
  const [tplSavingId, setTplSavingId] = useState<string | null>(null);
  const [tplError, setTplError] = useState<string | null>(null);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          rowMatchesSearch(row, searchQuery) && rowMatchesModeFilter(row, modeFilter),
      ),
    [rows, searchQuery, modeFilter],
  );

  // Reset the page window whenever filters change so "Load more" starts fresh.
  // Done in the setters (event handlers), not in an effect, so pagination
  // never lags a render behind the filter that caused it.
  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, []);
  const setModeFilter = useCallback((f: LibraryModeFilter) => {
    setModeFilterState(f);
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, []);

  const visibleRows = filteredRows.slice(0, visibleCount);
  const hasMore = filteredRows.length > visibleCount;

  const loadSaved = useCallback(async (userId: string) => {
    const client = createSupabaseBrowserClient();
    if (!client) {
      // Local mode without backend: library lives in localStorage.
      if (isUnlimitedMode()) {
        setLoading(true);
        setError(null);
        try {
          setRows(mapLocalLibraryRows(getLocalLibrary()));
        } catch {
          setError('Could not load saved prompts.');
          setRows([]);
        } finally {
          setLoading(false);
        }
        return;
      }
      setError('Library is unavailable.');
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await client
        .from('pp_saved_prompts')
        .select(
          'id,user_id,title,original_prompt,optimized_prompt,explanation,mode,provider,created_at',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(500);

      if (qErr) throw qErr;
      const list = Array.isArray(data) ? data.filter(isSavedPromptRow) : [];
      setRows(list);
    } catch {
      setError('Could not load saved prompts.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmDelete = useCallback(async (id: string) => {
    if (!id || !user) return;

    setError(null);
    setRows((r) => r.filter((row) => row.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));

    // Local mode: delete from localStorage, no backend involved.
    if (user.id === 'local') {
      if (!deleteLocalLibraryRow(id)) {
        setError('Could not delete prompt.');
        setRows(mapLocalLibraryRows(getLocalLibrary()));
      }
      return;
    }

    const client = createSupabaseBrowserClient();
    if (!client) {
      setError('Library is unavailable.');
      void loadSaved(user.id);
      return;
    }

    const { error: delErr } = await client
      .from('pp_saved_prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (delErr) {
      setError('Could not delete prompt.');
      void loadSaved(user.id);
    }
  }, [user, loadSaved]);

  const reoptimize = useCallback(
    (row: SavedPromptRow) => {
      stashReoptimizeDraft({
        text: row.original_prompt,
        mode: row.mode,
        autoOptimize: true,
      });
      router.push('/app');
    },
    [router],
  );

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PROMPT_TEMPLATES.filter(
      (t) =>
        (tplCategory === 'All' || t.category === tplCategory) &&
        (!q ||
          `${t.title} ${t.description} ${t.category}`.toLowerCase().includes(q)),
    );
  }, [tplCategory, searchQuery]);

  const templateCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of PROMPT_TEMPLATES) {
      counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    }
    return counts;
  }, []);

  const isTplSaved = useCallback(
    (id: string) =>
      savedTplIds.has(id) ||
      (user?.id === 'local' && isInLocalLibrary(`template:${id}`)),
    [savedTplIds, user],
  );

  /** Fork a template into the optimizer (loaded for review, not auto-run). */
  const useTemplate = useCallback(
    (tpl: PromptTemplate) => {
      stashReoptimizeDraft({
        text: tpl.optimized_prompt,
        mode: tpl.mode,
        autoOptimize: false,
      });
      router.push('/app');
    },
    [router],
  );

  const saveTemplate = useCallback(
    async (tpl: PromptTemplate) => {
      if (!user || tplSavingId || isTplSaved(tpl.id)) return;
      setTplSavingId(tpl.id);
      setTplError(null);
      try {
        if (user.id === 'local') {
          saveToLocalLibrary({
            title: tpl.title,
            prompt_original: tpl.original_prompt,
            prompt_optimized: tpl.optimized_prompt,
            explanation: tpl.explanation,
            mode: tpl.mode,
            provider: tpl.provider,
            session_id: `template-${tpl.id}`,
            history_id: `template:${tpl.id}`,
          });
        } else {
          const client = createSupabaseBrowserClient();
          if (!client) {
            setTplError('Sign in to save templates.');
            return;
          }
          const headers = await getPromptPerfectAuthHeaders(client);
          if (!headers) {
            setTplError('Sign in again to save templates.');
            return;
          }
          const res = await fetch('/api/saved-prompts', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: tpl.title,
              original_prompt: tpl.original_prompt,
              optimized_prompt: tpl.optimized_prompt,
              explanation: tpl.explanation,
              mode: tpl.mode,
              provider: tpl.provider,
            }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            setTplError(
              typeof data.error === 'string' && data.error
                ? data.error
                : 'Could not save template.',
            );
            return;
          }
        }
        setSavedTplIds((prev) => new Set(prev).add(tpl.id));
      } finally {
        setTplSavingId(null);
      }
    },
    [user, tplSavingId, isTplSaved],
  );

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const client = createSupabaseBrowserClient();
    if (!client) {
      // Local mode without backend: library works off localStorage, no sign-in.
      if (isUnlimitedMode()) {
        setUser({ id: 'local', name: 'Local device', email: '', provider: '', model: '' });
        void loadSaved('local');
        setAuthReady(true);
        return;
      }
      setUser(null);
      setRows([]);
      setLoading(false);
      setAuthReady(true);
      return;
    }
    let cancelled = false;
    void resolveAuthUserAndSession(client).then(({ user }) => {
      if (cancelled) return;
      if (!user?.id) {
        setUser(null);
        setRows([]);
        setLoading(false);
        setAuthReady(true);
        return;
      }
      const u = buildAppUserFromSupabaseUser(user, readEnginePrefs()) as AppUser;
      setUser(u);
      void loadSaved(u.id);
      setAuthReady(true);
    });
    return () => { cancelled = true; };
  }, [mounted, loadSaved]);

  const loadMore = useCallback(() => {
    setVisibleCount((n) => n + LIBRARY_PAGE_SIZE);
  }, []);

  return {
    mounted,
    authReady,
    user,
    rows,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    modeFilter,
    setModeFilter,
    expandedId,
    setExpandedId,
    visibleRows,
    filteredCount: filteredRows.length,
    hasMore,
    loadMore,
    confirmDelete,
    reoptimize,
    tab,
    setTab,
    tplCategory,
    setTplCategory,
    tplExpandedId,
    setTplExpandedId,
    filteredTemplates,
    templateCountByCategory,
    tplSavingId,
    tplError,
    isTplSaved,
    useTemplate,
    saveTemplate,
  };
}
