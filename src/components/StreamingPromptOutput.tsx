"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

const EXPLANATION_DELIMITER = "---EXPLANATION---";
const CHANGES_DELIMITER = "---CHANGES---";
const SCORE_PATTERN = /---SCORE---(\d{1,3})---/;

const optimizerTextarea =
  "pp-workspace-scroll box-border h-[380px] w-full shrink-0 resize-none overflow-y-auto rounded-[12px] border border-solid border-[#222] bg-[#0f0f0f] p-4 text-[14px] leading-relaxed text-[#ECECEC] placeholder-[#3a3a3a] outline-none transition-[border-color,box-shadow] duration-150 ease-out focus:border-[#4552FF] focus:shadow-[0_0_0_2px_#4552FF18] focus:outline-none disabled:opacity-50 font-[family-name:var(--font-space-grotesk),sans-serif] whitespace-pre-wrap break-words [word-break:break-word] overflow-wrap-anywhere";

export interface StreamingPromptOutputProps {
  text: string;
  isStreaming: boolean;
  onExplanation: (explanation: string) => void;
  onScore?: (score: number) => void | Promise<void>;
  variant?: "default" | "optimizer";
  /** Rendered directly under the optimized textarea (optimizer variant only). */
  afterTextarea?: ReactNode;
}

function optimizedFromFullText(fullText: string): string {
  const explIdx = fullText.indexOf(EXPLANATION_DELIMITER);
  const before =
    explIdx !== -1 ? fullText.slice(0, explIdx) : fullText;
  return before.replace(SCORE_PATTERN, "").trim();
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
  onScore,
  variant = "default",
  afterTextarea,
}: StreamingPromptOutputProps) {
  const lastExplRef = useRef("");
  const lastScoreRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  const optimized = useMemo(() => optimizedFromFullText(text), [text]);
  const explanation = useMemo(() => explanationFromFullText(text), [text]);

  useEffect(() => {
    if (explanation !== lastExplRef.current) {
      lastExplRef.current = explanation;
      onExplanation(explanation);
    }
  }, [explanation, onExplanation]);

  useEffect(() => {
    if (!onScore) return;
    const m = text.match(SCORE_PATTERN);
    if (!m) return;
    const score = parseInt(m[1], 10);
    if (Number.isNaN(score) || score === lastScoreRef.current) return;
    lastScoreRef.current = score;
    void onScore(score);
  }, [text, onScore]);

  const handleCopy = async () => {
    if (!optimized.trim()) return;
    try {
      await navigator.clipboard.writeText(optimized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
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
          <p className="mt-1 shrink-0 text-[13px] text-[#666]">Streaming…</p>
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
        rows={12}
        aria-label="Optimized prompt output"
        className="min-h-[200px] w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3.5 font-mono text-sm text-zinc-900 whitespace-pre-wrap break-words [word-break:break-word] overflow-wrap-anywhere dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {outLen} characters · est. {tokEst} tokens
      </p>
      {isStreaming && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Streaming…</p>
      )}
    </div>
  );
}
