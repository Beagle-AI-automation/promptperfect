"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

export interface HeaderProps {
  onApiKeyClick?: () => void;
}

export function Header({ onApiKeyClick }: HeaderProps) {
  return (
    <header className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-zinc-200 py-5 dark:border-zinc-800 sm:py-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          PromptPerfect
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          <a
            href="https://beaglecorp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#4552FF] underline-offset-2 hover:underline"
          >
            by Beagle
          </a>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        {onApiKeyClick && (
          <button
            type="button"
            onClick={onApiKeyClick}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#4552FF]/40 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-[#4552FF]/5 active:scale-[0.98] dark:border-[#4552FF]/50 dark:text-zinc-300 dark:hover:bg-[#4552FF]/10"
          >
            API key
          </button>
        )}
      </div>
    </header>
  );
}
