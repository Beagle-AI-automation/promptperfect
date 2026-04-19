'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Bookmark, Search, Trash2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { getPromptPerfectAuthHeaders } from '@/lib/client/promptPerfectAuthHeaders';
import { syncPpUserFromAuthSession } from '@/lib/client/ppUserSync';

interface SavedPrompt {
  id: string;
  title: string;
  original_prompt: string;
  optimized_prompt: string;
  explanation: string;
  mode: string;
  provider: string;
  created_at: string;
}

function hasPpUser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('pp_user');
    if (!raw) return false;
    const u = JSON.parse(raw) as { id?: string };
    return typeof u.id === 'string' && u.id.length > 0;
  } catch {
    return false;
  }
}

export default function LibraryPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mounted, setMounted] = useState(false);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadHint, setLoadHint] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoadHint(null);
    if (!supabase || !hasPpUser()) {
      setPrompts([]);
      setLoading(false);
      return;
    }

    await syncPpUserFromAuthSession(supabase);

    const headers = await getPromptPerfectAuthHeaders(supabase);
    if (!headers) {
      setLoadError('Sign in again to load your library.');
      setPrompts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/saved-prompts', { headers });
      const data = (await res.json().catch(() => ({}))) as {
        prompts?: SavedPrompt[];
        error?: string;
        hint?: string;
        code?: string;
      };
      if (!res.ok) {
        setLoadError(data.error || 'Could not load library');
        setLoadHint(data.hint ?? null);
        setPrompts([]);
        return;
      }
      setPrompts(Array.isArray(data.prompts) ? data.prompts : []);
    } catch {
      setLoadError('Network error');
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  const handleDelete = async (id: string) => {
    if (!supabase || !hasPpUser()) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const headers = await getPromptPerfectAuthHeaders(supabase);
      if (!headers) {
        setDeleteError('Sign in again to delete.');
        return;
      }
      const res = await fetch(`/api/saved-prompts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setPrompts((prev) => prev.filter((p) => p.id !== id));
        setExpandedId((e) => (e === id ? null : e));
      } else {
        setDeleteError(body.error || 'Could not delete prompt');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleReoptimize = (prompt: SavedPrompt) => {
    sessionStorage.setItem(
      'pp_reoptimize',
      JSON.stringify({
        text: prompt.original_prompt,
        mode: prompt.mode,
      }),
    );
    router.push('/app');
  };

  const q = search.trim().toLowerCase();
  const filtered = prompts.filter((p) => {
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.original_prompt.toLowerCase().includes(q) ||
      p.optimized_prompt.toLowerCase().includes(q) ||
      p.explanation.toLowerCase().includes(q);
    const matchesMode = !modeFilter || p.mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <p className="text-[#B0B0B0]">Loading…</p>
      </div>
    );
  }

  const authed = hasPpUser();

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#050505]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
          <Link
            href="/app"
            className="text-sm text-[#888] transition hover:text-[#ECECEC]"
          >
            ← Optimizer
          </Link>
          <span className="font-heading text-sm font-medium text-[#E7E6D9]">
            Library
          </span>
          {authed ? (
            <Link
              href="/profile"
              className="text-sm text-[#888] transition hover:text-[#ECECEC]"
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-[#888] transition hover:text-[#ECECEC]"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="font-heading text-3xl font-bold text-[#E7E6D9]">
            Prompt Library
          </h1>
          <span className="text-sm text-[#71717A]">
            {authed
              ? search.trim() || modeFilter
                ? `${filtered.length} of ${prompts.length} shown`
                : `${prompts.length} saved`
              : 'Sign in to save'}
          </span>
        </div>

        {!authed ? (
          <p className="mb-6 rounded-lg border border-[#252525] bg-[#0A0A0A]/80 px-4 py-3 text-sm text-[#B0B0B0]">
            Your library lives on your account.{' '}
            <Link href="/signup" className="text-[#4552FF] hover:underline">
              Sign up
            </Link>{' '}
            or{' '}
            <Link href="/login" className="text-[#4552FF] hover:underline">
              log in
            </Link>{' '}
            to save prompts from the optimizer—guests can still browse this page.
          </p>
        ) : null}

        {deleteError ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {deleteError}
          </div>
        ) : null}

        {loadError ? (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <p>{loadError}</p>
            {loadHint ? (
              <p className="mt-1 text-xs text-red-200/80">{loadHint}</p>
            ) : null}
            <Link
              href="/login"
              className="mt-2 inline-block text-[#4552FF] hover:underline"
            >
              Log in
            </Link>
          </div>
        ) : null}

        <div
          className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-center ${!authed ? 'opacity-60' : ''}`}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or content…"
              disabled={!authed}
              className="w-full rounded-lg border border-[#252525] bg-[#0A0A0A] py-2.5 pl-10 pr-4 text-white placeholder-[#71717A] focus:border-[#4552FF] focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex shrink-0 gap-2">
            {(['better', 'specific', 'cot'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={!authed}
                onClick={() =>
                  setModeFilter(modeFilter === mode ? null : mode)
                }
                className={`rounded-lg px-3 py-2 font-heading text-sm transition disabled:cursor-not-allowed ${
                  modeFilter === mode
                    ? 'bg-[#4552FF] text-white'
                    : 'border border-[#252525] bg-[#0A0A0A] text-[#B0B0B0] hover:border-[#4552FF]'
                }`}
              >
                {mode === 'cot' ? 'CoT' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="py-16 text-center text-[#71717A]">Loading library…</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Bookmark
              className="mx-auto mb-4 h-12 w-12 text-[#4552FF]/80"
              strokeWidth={1}
              aria-hidden
            />
            <p className="text-[#B0B0B0]">
              {search || modeFilter
                ? 'No matching prompts'
                : authed
                  ? 'No saved prompts yet. Optimize a prompt and click “Save to Library”.'
                  : 'No saved prompts yet. Create a free account to save prompts from the optimizer.'}
            </p>
            {!authed && !(search || modeFilter) ? (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/signup"
                  className="rounded-lg bg-[#4552FF] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                >
                  Sign up free
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-[#252525] px-5 py-2.5 text-sm text-[#E7E6D9] hover:border-[#4552FF]"
                >
                  Log in
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((prompt) => (
              <div
                key={prompt.id}
                className="rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 transition hover:border-[#3F3F46]"
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setExpandedId(expandedId === prompt.id ? null : prompt.id)
                    }
                  >
                    <h3 className="truncate font-heading font-medium text-[#E7E6D9]">
                      {prompt.title}
                    </h3>
                    <p className="mt-1 truncate text-sm text-[#71717A]">
                      {prompt.original_prompt.length > 80
                        ? `${prompt.original_prompt.slice(0, 80)}…`
                        : prompt.original_prompt}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => void handleDelete(prompt.id)}
                      disabled={deletingId === prompt.id || !authed}
                      className="rounded-md p-1.5 text-[#71717A] transition hover:bg-red-500/15 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                      aria-label={`Remove ${prompt.title} from library`}
                      title={
                        authed
                          ? 'Remove from library'
                          : 'Sign in to manage saves'
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                    <span
                      className={`rounded px-2 py-0.5 font-heading text-xs ${
                        prompt.mode === 'better'
                          ? 'bg-[#4552FF]/20 text-[#4552FF]'
                          : prompt.mode === 'specific'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      {prompt.mode === 'cot' ? 'CoT' : prompt.mode}
                    </span>
                    <span className="text-xs text-[#71717A]">
                      {new Date(prompt.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {expandedId === prompt.id ? (
                  <div className="mt-4 border-t border-[#252525] pt-4">
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs text-[#71717A]">Original</p>
                        <p className="whitespace-pre-wrap text-sm text-[#B0B0B0]">
                          {prompt.original_prompt}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-[#71717A]">Optimized</p>
                        <p className="whitespace-pre-wrap text-sm text-[#ECECEC]">
                          {prompt.optimized_prompt}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReoptimize(prompt);
                        }}
                        className="flex items-center gap-1.5 text-sm text-[#4552FF] hover:underline"
                      >
                        <ArrowRight size={14} aria-hidden />
                        Re-optimize
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
