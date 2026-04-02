'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { BarChart3, Clock, User, Zap } from 'lucide-react';

import {
  ensureUserProfile,
  getUserStats,
  updateUserProfile,
  type UserProfile,
} from '@/lib/client/userProfile';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createBrowserClient(url, key);
  }, []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    favoriteMode: null as string | null,
    favoriteProvider: null as string | null,
  });
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!supabase) {
        router.push('/login');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (!user) {
        router.push('/login');
        return;
      }

      const profileData = await ensureUserProfile(user);
      const statsData = await getUserStats(user.id);

      if (cancelled) return;
      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name);
        setAvatarUrl(profileData.avatar_url ?? '');
      }
      setStats(statsData);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleSave = async () => {
    if (!profile || !supabase) return;
    setSaveError('');
    const trimmedAvatar = avatarUrl.trim();
    const { error } = await updateUserProfile(profile.id, {
      display_name: displayName.trim() || profile.display_name,
      avatar_url: trimmedAvatar.length > 0 ? trimmedAvatar : null,
    });
    if (error) {
      setSaveError(error.message);
      return;
    }
    setProfile({
      ...profile,
      display_name: displayName.trim() || profile.display_name,
      avatar_url: trimmedAvatar.length > 0 ? trimmedAvatar : null,
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <p className="text-[#B0B0B0]">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-4">
        <p className="text-center text-[#B0B0B0]">
          We could not load your profile. Check Supabase configuration or try again
          later.
        </p>
        <Link
          href="/app"
          className="text-sm text-[#4552FF] hover:underline"
        >
          Back to app
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="border-b border-[#252525] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/app"
            className="text-sm text-[#71717A] transition hover:text-[#B0B0B0]"
          >
            ← App
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-heading text-3xl font-bold text-[#E7E6D9]">
          Your profile
        </h1>

        <div className="mb-8 rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#4552FF]/20">
                <User className="h-8 w-8 text-[#4552FF]" strokeWidth={1} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex flex-col gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-[#71717A]">
                      Display name
                    </span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-2 text-white focus:border-[#4552FF] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-[#71717A]">
                      Avatar URL
                    </span>
                    <input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-2 text-white placeholder-[#71717A] focus:border-[#4552FF] focus:outline-none"
                    />
                  </label>
                  {saveError ? (
                    <p className="text-sm text-red-400">{saveError}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      className="text-sm text-[#4552FF] hover:underline"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setDisplayName(profile.display_name);
                        setAvatarUrl(profile.avatar_url ?? '');
                        setSaveError('');
                      }}
                      className="text-sm text-[#71717A] hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-heading text-xl font-semibold text-[#E7E6D9]">
                    {profile.display_name}
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="ml-2 text-sm text-[#71717A] hover:text-[#B0B0B0]"
                    >
                      Edit
                    </button>
                  </h2>
                  <p className="text-sm text-[#B0B0B0]">
                    {profile.email ?? '—'}
                  </p>
                  <p className="mt-1 text-xs text-[#71717A]">
                    Member since{' '}
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <Zap
              className="mx-auto mb-2 h-8 w-8 text-[#4552FF]"
              strokeWidth={1}
            />
            <p className="font-heading text-2xl font-bold capitalize text-[#E7E6D9]">
              {stats.favoriteMode || '—'}
            </p>
            <p className="text-sm text-[#B0B0B0]">Favorite mode</p>
          </div>
          <div className="rounded-xl border border-[#252525] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 text-center">
            <Clock
              className="mx-auto mb-2 h-8 w-8 text-[#4552FF]"
              strokeWidth={1}
            />
            <p className="font-heading text-2xl font-bold capitalize text-[#E7E6D9]">
              {stats.favoriteProvider || '—'}
            </p>
            <p className="text-sm text-[#B0B0B0]">Most used provider</p>
          </div>
        </div>
      </main>
    </div>
  );
}
