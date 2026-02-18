'use client';

import { Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { splitOptimizedOutput } from '@/lib/delimiter';

interface PromptOutputProps {
  completion: string;
  isLoading: boolean;
  onExplanation: (text: string) => void;
}

/** Rough token estimate: ~4 chars per token for typical English text. */
function estimateTokenCount(text: string): number {
  if (!text.trim()) return 0;
  return Math.ceil(text.trim().length / 4);
}

export function PromptOutput({ completion, isLoading, onExplanation }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const lastExplanationRef = useRef('');

  const { optimizedText, explanation } = splitOptimizedOutput(completion);
  const displayText = optimizedText;
  const tokenCount = estimateTokenCount(displayText);

  useEffect(() => {
    if (explanation && explanation !== lastExplanationRef.current) {
      lastExplanationRef.current = explanation;
      onExplanation(explanation);
    }
  }, [explanation, onExplanation]);

  const handleCopy = async () => {
    if (!displayText.trim()) return;
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 900);
  };

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white/50 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/30 md:p-7">
      <div className="relative mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">
          Optimized prompt
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && displayText.trim() ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ~{tokenCount} tokens
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!displayText.trim() || isLoading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-zinc-200 bg-white/70 p-2 text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50 dark:hover:bg-zinc-950"
            aria-label="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
            {copied ? (
              <span className="text-xs font-semibold">Copied</span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="min-h-[420px] w-full overflow-auto rounded-3xl border border-zinc-200 bg-white/70 px-5 py-4 text-sm leading-7 text-zinc-900 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50">
        <div className="whitespace-pre-wrap break-words">
          {displayText}
          {isLoading ? (
            <span
              className="inline-block animate-[cursor-blink_1s_ease-in-out_infinite]"
              aria-hidden
            >
              |
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
