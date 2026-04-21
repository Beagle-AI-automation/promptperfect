'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Clock, User, Zap } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import { clearPromptPerfectLocalAuth } from '@/lib/client/ppUserSync';
import {
  NAV_PROFILE_UPDATED_EVENT,
  writeNavProfileCache,
} from '@/lib/client/navProfileCache';
import {
  fetchProfileFromApi,
  updateUserProfile,
  type UserProfile,
  type UserStats,
} from '@/lib/client/userProfile';

function formatModeLabel(mode: string | null): string {
  if (!mode) return '—';
  const m = mode.toLowerCase();
  if (m === 'better') return 'Better';
  if (m === 'specific') return 'Specific';
  if (m === 'cot') return 'Chain-of-Thought';
  return mode;
}

function formatProviderLabel(p: string | null): string {
  if (!p) return '—';
  const x = p.toLowerCase();
  if (x === 'gemini') return 'Gemini';
  if (x === 'openai') return 'OpenAI';
  if (x === 'anthropic') return 'Anthropic';
  return p;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    favoriteMode: null,
    favoriteProvider: null,
    thumbsUp: 0,
    thumbsDown: 0,
  });
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadHint, setLoadHint] = useState<string | null>(null);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoadHint(null);
    setLoadErrorCode(null);
    setNeedsSignIn(false);

    if (!supabase) {
      setLoading(false);
      return;
    }

    const result = await fetchProfileFromApi(supabase);

    if (!result.ok) {
      const d = result.detail;
      // Only prompt for sign-in when we truly sent no credentials — not when the API rejected a 401 (e.g. misconfigured service key or stale id).
      if (d.code === 'NO_AUTH_HEADERS') {
        setNeedsSignIn(true);
        setLoading(false);
        return;
      }
      const codeSuffix = d.code ? ` [${d.code}]` : '';
      setLoadError(d.error + codeSuffix);
      setLoadHint(d.hint ?? null);
      setLoadErrorCode(d.code ?? null);
      setLoading(false);
      return;
    }

    setLoadErrorCode(null);
    setProfile(result.profile);
    setDisplayName(result.profile.display_name || '');
    setAvatarUrl(result.profile.avatar_url || '');
    setStats(result.stats);
    writeNavProfileCache(result.profile.id, {
      avatarUrl: result.profile.avatar_url ?? null,
      displayName: result.profile.display_name ?? null,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleResetAuth = async () => {
    await clearPromptPerfectLocalAuth(supabase);
    router.replace('/login');
  };

  const handleSave = async () => {
    if (!profile || !supabase) return;
    setSaveError(null);
    setSaving(true);
    try {
      const { error, profile: next } = await updateUserProfile(
        profile.id,
        {
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim() || null,
        },
        supabase,
      );

      if (error) {
        setSaveError(error.message);
        return;
      }

      if (next) {
        setProfile(next);
        setDisplayName(next.display_name || '');
        setAvatarUrl(next.avatar_url || '');
        writeNavProfileCache(next.id, {
          avatarUrl: next.avatar_url ?? null,
          displayName: next.display_name ?? null,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(NAV_PROFILE_UPDATED_EVENT, {
              detail: {
                userId: next.id,
                avatar_url: next.avatar_url,
                display_name: next.display_name,
              },
            }),
          );
        }
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!supabase && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
        <p className="text-center text-[#B0B0B0]">
          Supabase is not configured. Add{' '}
          <code className="text-[#4552FF]">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="text-[#4552FF]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <p className="text-[#B0B0B0]">Loading…</p>
      </div>
    );
  }

  if (needsSignIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-4">
        <p className="max-w-md text-center text-[#B0B0B0]">
          We couldn’t load your profile because <strong className="text-[#E7E6D9]">this browser tab</strong> has no active sign-in. Profile only opens after you authenticate here (same device and browser where you use the app).
        </p>
        <p className="max-w-md text-center text-sm text-[#71717A]">
          Use <strong className="text-[#B0B0B0]">Log in</strong> or{' '}
          <strong className="text-[#B0B0B0]">Sign up</strong> below, then open Profile again—or go to the app, sign in from the header, then use the Profile link.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-[#4552FF] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
        >
          Go to sign in
        </Link>
        <Link href="/app" className="text-sm text-[#71717A] hover:text-[#B0B0B0]">
          Back to app
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-4">
        <p className="max-w-lg text-center text-red-400">{loadError}</p>
        {loadHint && (
          <p className="max-w-lg text-center text-sm text-[#71717A]">{loadHint}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-[#252525] px-4 py-2 text-sm text-[#E7E6D9] hover:bg-[#141414]"
          >
            Retry
          </button>
          {loadErrorCode === 'AUTH_ADMIN_LOOKUP_FAILED' ? (
            <button
              type="button"
              onClick={() => void handleResetAuth()}
              className="rounded-lg bg-[#4552FF] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              Sign out and sign in again
            </button>
          ) : null}
          <Link href="/app" className="text-sm text-[#4552FF] hover:underline">
            Back to app
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-4">
        <p className="text-[#B0B0B0]">Could not load your profile.</p>
        <Link href="/app" className="text-[#4552FF] hover:underline">
          Back to app
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="border-b border-[#1a1a1a] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            href="/app"
            className="text-sm text-[#71717A] transition hover:text-[#B0B0B0]"
          >
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="mb-1 text-lg text-[#B0B0B0]">
          Hi,{' '}
          <span className="text-[#E7E6D9]">
            {profile.display_name?.trim() ||
              profile.email.split('@')[0] ||
              'there'}
          </span>
        </p>
        <h1 className="mb-2 font-heading text-3xl font-bold text-[#E7E6D9]">
          Your profile
        </h1>
        <p className="mb-8 text-sm text-[#71717A]">
          To edit: click <strong className="text-[#B0B0B0]">Edit</strong> next to
          your name, change display name and/or avatar image URL, then{' '}
          <strong className="text-[#B0B0B0]">Save</strong>.
        </p>

        {saveError && (
          <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {saveError}
          </p>
        )}

        <div className="mb-8 rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied arbitrary URL
              <img
                src={profile.avatar_url}
                alt=""
                className="mx-auto h-20 w-20 shrink-0 rounded-full object-cover sm:mx-0"
              />
            ) : (
              <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#4552FF]/20 sm:mx-0">
                <User className="h-10 w-10 text-[#4552FF]" strokeWidth={1} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#71717A]">
                      Display name
                    </label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-2 text-[#E7E6D9] focus:border-[#4552FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#71717A]">
                      Avatar URL
                    </label>
                    <input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-2 text-[#E7E6D9] placeholder:text-[#52525b] focus:border-[#4552FF] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="rounded-lg bg-[#4552FF] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setSaveError(null);
                        setDisplayName(profile.display_name || '');
                        setAvatarUrl(profile.avatar_url || '');
                      }}
                      className="rounded-lg border border-[#252525] px-4 py-2 text-sm text-[#B0B0B0] hover:bg-[#141414]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="font-heading text-xl font-semibold text-[#E7E6D9]">
                      {profile.display_name || 'User'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(true);
                        setSaveError(null);
                      }}
                      className="text-sm text-[#71717A] hover:text-[#B0B0B0]"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-[#B0B0B0]">{profile.email}</p>
                  <p className="mt-2 text-xs text-[#71717A]">
                    Member since{' '}
                    {new Date(profile.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="mt-3 text-sm text-[#B0B0B0]">
                    <span className="font-medium text-[#E7E6D9]">
                      {profile.optimization_count}
                    </span>{' '}
                    optimizations saved to your account
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <h2 className="mb-4 font-heading text-lg font-semibold text-[#E7E6D9]">
          Account overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 text-center">
            <BarChart3
              className="mx-auto mb-2 h-8 w-8 text-[#4552FF]"
              strokeWidth={1}
            />
            <p className="font-heading text-2xl font-bold text-[#E7E6D9]">
              {stats.total}
            </p>
            <p className="text-sm text-[#B0B0B0]">Total optimizations</p>
          </div>
          <div className="rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 text-center">
            <Zap className="mx-auto mb-2 h-8 w-8 text-[#4552FF]" strokeWidth={1} />
            <p className="font-heading text-2xl font-bold text-[#E7E6D9]">
              {formatModeLabel(stats.favoriteMode)}
            </p>
            <p className="text-sm text-[#B0B0B0]">Favorite mode</p>
          </div>
          <div className="rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-[#4552FF]" strokeWidth={1} />
            <p className="font-heading text-2xl font-bold text-[#E7E6D9]">
              {formatProviderLabel(stats.favoriteProvider)}
            </p>
            <p className="text-sm text-[#B0B0B0]">Most-used provider</p>
          </div>
        </div>
      </main>
    </div>
  );
}
