'use client';

import Link from 'next/link';

export function LandingHeader() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-[#050505]">
      <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-xl font-bold text-zinc-900 dark:text-[#ECECEC]">
        <span>PromptPerfect</span>
        <a
          href="https://beaglecorp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[#4552FF] underline-offset-2 transition hover:underline"
        >
          by Beagle
        </a>
      </h1>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="cursor-pointer rounded-lg border border-[#4552FF] px-4 py-2 text-sm font-medium text-[#4552FF] transition hover:bg-[#4552FF]/10"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="cursor-pointer rounded-lg bg-[#4552FF] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Sign Up
        </Link>
      </div>
    </header>
  );
}
