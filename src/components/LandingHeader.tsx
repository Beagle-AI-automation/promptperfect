'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const PP_USER_KEY = 'pp_user';

export function LandingHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      setSignedIn(!!localStorage.getItem(PP_USER_KEY)?.trim());
    } catch {
      setSignedIn(false);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === PP_USER_KEY || e.key === null) {
        try {
          setSignedIn(!!localStorage.getItem(PP_USER_KEY)?.trim());
        } catch {
          setSignedIn(false);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#050505]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3 md:px-6">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-[#ECECEC] sm:text-xl">
            <Link href="/" className="hover:opacity-90">
              PromptPerfect
            </Link>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
            by{' '}
            <a
              href="https://beaglecorp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#4552FF] underline-offset-2 hover:underline"
            >
              Beagle
            </a>
          </p>
        </div>

        <nav
          aria-label="Main"
          className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:justify-end sm:gap-x-3"
        >
          <Link
            href="/app"
            className="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-[#ECECEC] sm:text-sm sm:px-2.5"
          >
            App
          </Link>
          <Link
            href="/library"
            className="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-[#ECECEC] sm:text-sm sm:px-2.5"
          >
            Library
          </Link>
          <Link
            href="/docs"
            className="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-[#ECECEC] sm:text-sm sm:px-2.5"
          >
            API Docs
          </Link>
          {signedIn ? (
            <Link
              href="/profile"
              className="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-[#ECECEC] sm:text-sm sm:px-2.5"
            >
              Profile
            </Link>
          ) : null}
          <span
            className="hidden h-4 w-px bg-zinc-300 dark:bg-zinc-700 sm:inline-block"
            aria-hidden
          />
          <Link
            href="/login"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#4552FF] px-3 py-2 text-xs font-medium text-[#4552FF] transition hover:bg-[#4552FF]/10 sm:min-h-[44px] sm:px-4 sm:text-sm"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-[#4552FF] px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 sm:min-h-[44px] sm:px-4 sm:text-sm"
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}
