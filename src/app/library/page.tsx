'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bookmark, ChevronDown, ChevronUp, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import {
  buildAppUserFromSupabaseUser,
  readEnginePrefs,
} from '@/lib/client/enginePrefsStorage';
import { resolveAuthUserAndSession } from '@/lib/client/ppUserSync';

const REOPTIMIZE_SESSION_KEY = 'pp_reoptimize';
const PREVIEW_LEN = 120;

interface PPUser {
  id: string;
  name: string | null;
  email: string;
  provider: string;
  model: string;
}

interface SavedPromptRow {
  id: string;
  user_id: string;
  title: string;
  original_prompt: string;
  optimized_prompt: string;
  explanation: string;
  mode: string;
  provider: string;
  created_at: string;
}

function previewText(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= PREVIEW_LEN) return t || '—';
  return `${t.slice(0, PREVIEW_LEN)}…`;
}

function rowMatchesSearch(row: SavedPromptRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const title = (row.title ?? '').toLowerCase();
  const orig = (row.original_prompt ?? '').toLowerCase();
  const opt = (row.optimized_prompt ?? '').toLowerCase();
  return title.includes(q) || orig.includes(q) || opt.includes(q);
}

type LibraryModeFilter = 'all' | 'better' | 'specific' | 'cot';

function rowMatchesModeFilter(row: SavedPromptRow, filter: LibraryModeFilter): boolean {
  if (filter === 'all') return true;
  const m = (row.mode ?? '').trim().toLowerCase();
  if (filter === 'better') return m === 'better';
  if (filter === 'specific') return m === 'specific';
  if (filter === 'cot') return m === 'cot' || m === 'chain-of-thought' || m === 'chain_of_thought';
  return true;
}

function modeBadgeLabel(mode: string): string {
  const m = mode.trim().toLowerCase();
  if (m === 'cot' || m === 'chain-of-thought' || m === 'chain_of_thought') return 'CoT';
  return mode;
}

function LibraryEmptyState({
  message,
  children,
}: {
  message: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[12px] border border-dashed border-[#2a2a2a] bg-[#090909] px-6 py-14 text-center"
    >
      <p className="text-[15px] font-medium leading-relaxed text-[#ccc]">{message}</p>
      {children ? <div className="mt-6 flex flex-col items-center gap-3">{children}</div> : null}
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<PPUser | null>(null);
  const [rows, setRows] = useState<SavedPromptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<LibraryModeFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          rowMatchesSearch(row, searchQuery) && rowMatchesModeFilter(row, modeFilter),
      ),
    [rows, searchQuery, modeFilter],
  );

  const loadSaved = useCallback(async (userId: string) => {
    const client = createSupabaseBrowserClient();
    if (!client) {
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
        .order('created_at', { ascending: false });

      if (qErr) throw qErr;
      setRows((data as SavedPromptRow[]) ?? []);
    } catch {
      setError('Could not load saved prompts.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;
      setError(null);
      setRows((r) => r.filter((row) => row.id !== id));
      setExpandedId((prev) => (prev === id ? null : prev));

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
    },
    [user, loadSaved],
  );

  const handleReoptimize = useCallback(
    (row: SavedPromptRow) => {
      try {
        sessionStorage.setItem(
          REOPTIMIZE_SESSION_KEY,
          JSON.stringify({
            original_prompt: row.original_prompt,
            mode: row.mode,
          }),
        );
      } catch {
        // ignore quota / private mode
      }
      router.push('/app');
    },
    [router],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const client = createSupabaseBrowserClient();
    if (!client) {
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
      const u = buildAppUserFromSupabaseUser(user, readEnginePrefs()) as PPUser;
      setUser(u);
      void loadSaved(u.id);
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, loadSaved]);

  if (!mounted || !authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <p className="text-sm text-[#888]">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] px-6 py-12 font-sans text-[#ECECEC]">
        <div className="mx-auto max-w-md text-center">
          <Bookmark className="mx-auto mb-4 h-16 w-16 text-[#4552FF]" strokeWidth={1} aria-hidden />
          <h2 className="mb-2 font-[family-name:var(--font-space-grotesk),sans-serif] text-2xl font-bold text-[#E7E6D9]">
            Your Prompt Library
          </h2>
          <div className="mb-8">
            <Link href="/" className="inline-block text-lg font-bold text-[#ECECEC]">
              PromptPerfect
            </Link>
          </div>
          <LibraryEmptyState message="Sign up to save prompts">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#4552FF,#5c6aff)] px-8 text-[15px] font-semibold text-white transition-opacity hover:opacity-95"
            >
              Sign up
            </Link>
          </LibraryEmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-8 font-sans text-[#ECECEC]">
      <header className="mx-auto mb-8 flex max-w-4xl flex-wrap items-center justify-between gap-4 border-b border-[#1a1a1a] pb-4">
        <div className="flex flex-col gap-1">
          <Link href="/" className="text-lg font-bold text-[#ECECEC]">
            PromptPerfect
          </Link>
          <h1 className="font-[family-name:var(--font-space-grotesk),sans-serif] text-2xl font-bold text-[#E7E6D9]">
            Prompt Library
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-[13px] text-[#888]">{user.name || user.email}</span>
          <span className="text-[12px] text-[#71717A]">{rows.length} saved</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl">
        <label className="relative mb-4 block">
          <span className="sr-only">Search saved prompts</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts…"
            autoComplete="off"
            className="w-full rounded-[12px] border border-[#252525] bg-[#0A0A0A] py-2.5 pl-10 pr-4 text-[14px] text-white outline-none placeholder:text-[#71717A] focus:border-[#4552FF]"
          />
        </label>

        <div
          className="mb-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by optimization mode"
        >
          {(
            [
              { id: 'all' as const, label: 'All' },
              { id: 'better' as const, label: 'Better' },
              { id: 'specific' as const, label: 'Specific' },
              { id: 'cot' as const, label: 'CoT' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setModeFilter(id)}
              aria-pressed={modeFilter === id}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                modeFilter === id
                  ? 'border-[#4552FF] bg-[#4552FF]/20 text-[#ECECEC]'
                  : 'border-[#2a2a2a] bg-[#0A0A0A] text-[#B0B0B0] hover:border-[#4552FF]/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[#888]">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : rows.length === 0 ? (
          <LibraryEmptyState message="No saved prompts yet" />
        ) : filteredRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#71717A]">
            {searchQuery.trim() || modeFilter !== 'all'
              ? 'No matching prompts'
              : 'No prompts match your filters.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredRows.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <li
                  key={row.id}
                  className="rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 transition hover:border-[#3F3F46]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-[family-name:var(--font-space-grotesk),sans-serif] text-[15px] font-medium text-[#E7E6D9]">
                        {row.title}
                      </h2>
                      <p className="mt-1 truncate text-[13px] text-[#aaa]">
                        {previewText(row.original_prompt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          row.mode === 'better'
                            ? 'bg-[#4552FF]/20 text-[#4552FF]'
                            : row.mode === 'specific'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        {modeBadgeLabel(row.mode)}
                      </span>
                      <span className="text-[11px] text-[#71717A]">
                        {new Date(row.created_at).toLocaleDateString()}
                      </span>
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-[#71717A]" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#71717A]" aria-hidden />
                      )}
                    </div>
                  </button>

                  {expanded ? (
                    <div className="mt-4 border-t border-[#252525] pt-4">
                      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-[11px] text-[#71717A]">Original</p>
                          <p className="whitespace-pre-wrap text-sm text-[#B0B0B0]">
                            {row.original_prompt || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] text-[#71717A]">Optimized</p>
                          <p className="whitespace-pre-wrap text-sm text-[#ECECEC]">
                            {row.optimized_prompt || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleReoptimize(row)}
                          className="inline-flex items-center gap-1.5 text-sm text-[#4552FF] hover:underline"
                        >
                          <ArrowRight size={14} aria-hidden />
                          Re-optimize
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id)}
                          className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:underline"
                        >
                          <Trash2 size={14} aria-hidden />
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
