'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export function PromptPerfectHeader() {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
              <Sparkles className="h-4 w-4" />
            </span>
            PromptPerfect
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
            Minimal in. Perfect out.
          </h1>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link
            href="/legacy"
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50 dark:hover:bg-zinc-950"
          >
            View old page <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Paste a messy prompt, get a cleaner one back plus a short explanation
      </p>
    </header>
  );
}

