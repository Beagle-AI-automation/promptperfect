'use client';

import { RotateCcw, Sparkles } from 'lucide-react';

interface PromptPerfectActionsProps {
  canSubmit: boolean;
  isLoading: boolean;
  onSubmit: () => void;
  onReset: () => void;
  usedProvider?: string;
  usedModel?: string;
}

export function PromptPerfectActions(props: PromptPerfectActionsProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={props.onSubmit}
        disabled={!props.canSubmit || props.isLoading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        <Sparkles className="h-4 w-4" />
        {props.isLoading ? 'Perfecting…' : 'Perfect it'}
      </button>

      <button
        type="button"
        onClick={props.onReset}
        disabled={props.isLoading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white/70 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50 dark:hover:bg-zinc-950"
      >
        <RotateCcw className="h-4 w-4" />
        Reset
      </button>

      <div className="text-xs text-zinc-500 dark:text-zinc-400 sm:ml-auto">
        {props.usedModel ? (
          <>
            Provider: <span className="font-medium">{props.usedProvider}</span> · Model:{' '}
            <span className="font-medium">{props.usedModel}</span>
          </>
        ) : (
          ' '
        )}
      </div>
    </div>
  );
}

