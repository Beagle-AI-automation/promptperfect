'use client';

import { Settings } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          PromptPerfect
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">by Beagle</p>
      </div>
      <button
        type="button"
        onClick={onSettingsClick}
        className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
}
