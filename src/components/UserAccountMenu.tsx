'use client';

import Link from 'next/link';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';
import {
  NAV_PROFILE_UPDATED_EVENT,
  readNavProfileCache,
  writeNavProfileCache,
} from '@/lib/client/navProfileCache';
import { fetchProfileFromApi } from '@/lib/client/userProfile';

interface UserAccountMenuProps {
  userId: string;
  /** Used before / until profile loads (e.g. `pp_user.name` or email local part). */
  fallbackDisplayName: string;
  onLogout: () => void;
}

type ProfileSnippet = {
  displayName: string | null;
  avatarUrl: string | null;
};

/** Self-contained img fallback; parent passes `key={src}` so a new URL remounts and retries. */
function MenuAvatar({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <User className="h-[18px] w-[18px] text-[#71717A]" aria-hidden strokeWidth={1.75} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-supplied arbitrary URL from profile
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setBroken(true)}
    />
  );
}

export function UserAccountMenu({
  userId,
  fallbackDisplayName,
  onLogout,
}: UserAccountMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** API + custom event updates; falls back to sessionStorage snapshot in merge. */
  const [liveProfile, setLiveProfile] = useState<ProfileSnippet | null>(null);

  const uid = userId.trim();

  const cachedLayer = useMemo((): ProfileSnippet | null => {
    if (typeof window === 'undefined' || !uid) return null;
    const cached = readNavProfileCache(uid);
    if (!cached) return null;
    return {
      displayName: cached.displayName?.trim() || null,
      avatarUrl: cached.avatarUrl?.trim() || null,
    };
  }, [uid]);

  const merged: ProfileSnippet | null = liveProfile ?? cachedLayer;

  const displayName =
    merged?.displayName?.trim() || fallbackDisplayName;
  const rawAvatarUrl = merged?.avatarUrl?.trim() || null;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !uid) return;
    let cancelled = false;
    void fetchProfileFromApi(supabase).then((r) => {
      if (cancelled || !r.ok) return;
      const next = {
        displayName: r.profile.display_name?.trim() || null,
        avatarUrl: r.profile.avatar_url?.trim() || null,
      };
      setLiveProfile(next);
      writeNavProfileCache(uid, {
        avatarUrl: next.avatarUrl,
        displayName: next.displayName,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<{
        userId?: string;
        avatar_url?: string | null;
        display_name?: string | null;
      }>;
      const id = ce.detail?.userId?.trim();
      if (!id || id !== uid) return;
      const next = {
        displayName:
          typeof ce.detail.display_name === 'string'
            ? ce.detail.display_name.trim() || null
            : null,
        avatarUrl:
          ce.detail.avatar_url === null
            ? null
            : typeof ce.detail.avatar_url === 'string'
              ? ce.detail.avatar_url.trim() || null
              : null,
      };
      setLiveProfile(next);
      writeNavProfileCache(uid, {
        avatarUrl: next.avatarUrl,
        displayName: next.displayName,
      });
    };

    window.addEventListener(NAV_PROFILE_UPDATED_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(
        NAV_PROFILE_UPDATED_EVENT,
        handler as EventListener,
      );
  }, [uid]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /** Refresh when opening menu (e.g. after `/profile` edits). */
  useEffect(() => {
    if (!open) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !uid) return;
    let cancelled = false;
    void fetchProfileFromApi(supabase).then((r) => {
      if (cancelled || !r.ok) return;
      const next = {
        displayName: r.profile.display_name?.trim() || null,
        avatarUrl: r.profile.avatar_url?.trim() || null,
      };
      setLiveProfile(next);
      writeNavProfileCache(uid, {
        avatarUrl: next.avatarUrl,
        displayName: next.displayName,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, uid]);

  const handleLogout = useCallback(() => {
    setOpen(false);
    void onLogout();
  }, [onLogout]);

  const itemClass =
    'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#B0B0B0] transition hover:bg-[#141414] hover:text-[#ECECEC]';

  /** Destructive-style hover (logout), aligned with typical delete actions. */
  const logoutItemClass =
    'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#B0B0B0] transition hover:bg-red-950/35 hover:text-red-400 focus-visible:outline-none focus-visible:bg-red-950/35 focus-visible:text-red-400';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        id={`${menuId}-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${menuId}-panel` : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 max-w-[min(100vw-8rem,14rem)] items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#0f0f0f] py-1 pl-1 pr-2 transition hover:border-[#3f3f3f] hover:bg-[#141414]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1a1a1a]">
          {rawAvatarUrl ? (
            <MenuAvatar key={rawAvatarUrl} src={rawAvatarUrl} />
          ) : (
            <User className="h-[18px] w-[18px] text-[#71717A]" aria-hidden strokeWidth={1.75} />
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#71717A] transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={`${menuId}-panel`}
          role="menu"
          aria-labelledby={`${menuId}-trigger`}
          className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-xl border border-[#252525] bg-[#0A0A0A] py-1 shadow-xl ring-1 ring-black/40"
        >
          <div className="border-b border-[#252525] px-4 py-3">
            <p className="text-sm">
              <span className="font-semibold text-[#E7E6D9]">
                Hi, {displayName}
              </span>{' '}
              <span role="img" aria-label="Waving hand">
                👋
              </span>
            </p>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2} />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            className={logoutItemClass}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2} />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
