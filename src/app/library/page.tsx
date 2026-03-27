'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const PP_USER_KEY = 'pp_user';
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
  mode: string;
  created_at: string;
}

function previewText(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= PREVIEW_LEN) return t || '—';
  return `${t.slice(0, PREVIEW_LEN)}…`;
}

function formatCreated(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function rowMatchesSearch(row: SavedPromptRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const title = (row.title ?? '').toLowerCase();
  const prompt = (row.original_prompt ?? '').toLowerCase();
  return title.includes(q) || prompt.includes(q);
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

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          rowMatchesSearch(row, searchQuery) && rowMatchesModeFilter(row, modeFilter),
      ),
    [rows, searchQuery, modeFilter],
  );

  const loadSaved = useCallback(async (userId: string) => {
    const client = getSupabaseClient();
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
        .select('id,user_id,title,original_prompt,mode,created_at')
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

      const client = getSupabaseClient();
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
          JSON.stringify({ original_prompt: row.original_prompt }),
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
    try {
      const raw = localStorage.getItem(PP_USER_KEY);
      if (!raw) {
        setUser(null);
        setLoading(false);
        setAuthReady(true);
        return;
      }
      const u = JSON.parse(raw) as PPUser;
      if (!u?.id) {
        setUser(null);
        setLoading(false);
        setAuthReady(true);
        return;
      }
      setUser(u);
      void loadSaved(u.id);
      setAuthReady(true);
    } catch {
      setUser(null);
      setLoading(false);
      setAuthReady(true);
    }
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
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
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
      <header className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-between gap-4 border-b border-[#1a1a1a] pb-4">
        <div className="flex flex-col gap-1">
          <Link href="/" className="text-lg font-bold text-[#ECECEC]">
            PromptPerfect
          </Link>
          <span className="text-[13px] text-[#666]">Saved prompts</span>
        </div>
        <span className="text-[13px] text-[#888]">{user.name || user.email}</span>
      </header>

      <main className="mx-auto max-w-3xl">
        <label className="mb-4 block">
          <span className="sr-only">Search saved prompts</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or prompt…"
            autoComplete="off"
            className="w-full rounded-[12px] border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-[14px] text-[#ECECEC] outline-none placeholder:text-[#555] focus:border-[#4552FF]"
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
              { id: 'cot' as const, label: 'Chain-of-thought' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setModeFilter(id)}
              aria-pressed={modeFilter === id}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                modeFilter === id
                  ? 'border-[#4552FF] bg-[#1a1a2e] text-[#ECECEC]'
                  : 'border-[#2a2a2a] bg-transparent text-[#888] hover:border-[#3a3a3a] hover:text-[#ccc]'
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
          <p className="text-sm text-[#888]">No prompts match your filters.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredRows.map((row) => (
              <li
                key={row.id}
                className="rounded-[12px] border border-[#1e1e1e] bg-[#0d0d0d] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 flex-1 pr-1 text-[15px] font-semibold leading-snug text-[#ECECEC]">
                    {row.title}
                  </h2>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-[0.06em] text-[#666]">
                      {row.mode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleReoptimize(row)}
                      className="rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium text-[#888] transition-colors hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC]"
                    >
                      Re-optimize
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(row.id)}
                      aria-label="Delete saved prompt"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-[#555] transition-colors hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4552FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-[12px] text-[#666]">{formatCreated(row.created_at)}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#aaa]">
                  {previewText(row.original_prompt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
