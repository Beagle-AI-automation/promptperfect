"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

export interface HeaderProps {
  onApiKeyClick?: () => void;
}

export function Header({ onApiKeyClick }: HeaderProps) {
  return (
    <header className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-zinc-200 py-5 dark:border-zinc-800 sm:py-6">
      <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
        PromptPerfect
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        {onApiKeyClick && (
          <button
            type="button"
            onClick={onApiKeyClick}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            API key
          </button>
        )}
      </div>
    </header>
  );
}
