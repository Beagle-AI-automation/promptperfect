"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Check, Copy } from "lucide-react";
import { useCopy } from "@/lib/clipboard";

import {
  CHANGES_DELIMITER,
  EXPLANATION_DELIMITER,
  stripPromptScoreMarkers,
} from "@/lib/delimiter";
import { optimizerTextarea } from "@/components/ui/optimizerTextarea";

export interface StreamingPromptOutputProps {
  text: string;
  isStreaming: boolean;
  onExplanation: (explanation: string) => void;
  variant?: "default" | "optimizer";
  /** Rendered directly under the optimized textarea (optimizer variant only). */
  afterTextarea?: ReactNode;
}

function optimizedFromFullText(fullText: string): string {
  const explIdx = fullText.indexOf(EXPLANATION_DELIMITER);
  const before =
    explIdx !== -1 ? fullText.slice(0, explIdx) : fullText;
  return stripPromptScoreMarkers(before);
}

function explanationFromFullText(fullText: string): string {
  const explIdx = fullText.indexOf(EXPLANATION_DELIMITER);
  if (explIdx === -1) return "";
  const afterExpl = fullText.slice(explIdx + EXPLANATION_DELIMITER.length);
  const changesIdx = afterExpl.indexOf(CHANGES_DELIMITER);
  return (changesIdx !== -1 ? afterExpl.slice(0, changesIdx) : afterExpl).trim();
}

export function StreamingPromptOutput({
  text,
  isStreaming,
  onExplanation,
  variant = "default",
  afterTextarea,
}: StreamingPromptOutputProps) {
  const lastExplRef = useRef("");
  const { copied, copy } = useCopy();

  const optimized = useMemo(() => optimizedFromFullText(text), [text]);
  const explanation = useMemo(() => explanationFromFullText(text), [text]);

  useEffect(() => {
    if (explanation !== lastExplRef.current) {
      lastExplRef.current = explanation;
      onExplanation(explanation);
    }
  }, [explanation, onExplanation]);

  const handleCopy = async () => {
    if (!optimized.trim()) return;
    await copy(optimized);
  };

  const outLen = optimized.length;
  const tokEst = outLen === 0 ? 0 : Math.max(1, Math.ceil(outLen / 4));

  if (variant === "optimizer") {
    return (
      <div className="flex w-full min-w-0 flex-col">
        <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
          <span className="text-sm font-medium text-[#ECECEC]">
            Optimized prompt
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isStreaming || !optimized.trim()}
            aria-label={copied ? "Copied" : "Copy to clipboard"}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-[12px] text-[#888] transition-all duration-200 ease-out hover:border-[#2a2a2a] hover:bg-[#111] hover:text-[#ECECEC] disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="flex w-full min-w-0 flex-col items-start gap-0">
          <textarea
            readOnly
            value={optimized}
            placeholder="Your optimized prompt will stream here…"
            aria-label="Optimized prompt output"
            className={optimizerTextarea}
            rows={1}
          />
          {afterTextarea ? (
            <div className="mt-2 w-full shrink-0">{afterTextarea}</div>
          ) : null}
        </div>
        <p className="mt-2 shrink-0 text-[11px] text-[#5a5a5a]">
          {outLen} characters -- {tokEst} tokens
        </p>
        {isStreaming && (
          <p
            role="status"
            aria-live="polite"
            className="mt-1 flex shrink-0 items-center gap-1.5 text-[13px] text-[#808088]"
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
            />
            Streaming…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Optimized prompt
        </span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={isStreaming || !optimized.trim()}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          className="flex h-9 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <textarea
        readOnly
        value={optimized}
        placeholder="Your optimized prompt will stream here…"
        rows={12}
        aria-label="Optimized prompt output"
        className="min-h-[200px] w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3.5 font-mono text-sm text-zinc-900 whitespace-pre-wrap break-words [word-break:break-word] overflow-wrap-anywhere dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {outLen} characters · est. {tokEst} tokens
      </p>
      {isStreaming && (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400"
        >
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
          />
          Streaming…
        </p>
      )}
    </div>
  );
}
