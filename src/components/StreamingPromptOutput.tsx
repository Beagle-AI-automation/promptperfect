"use client";

import { useEffect, useMemo, useRef } from "react";

const EXPLANATION_DELIMITER = "---EXPLANATION---";
const CHANGES_DELIMITER = "---CHANGES---";
const SCORE_PATTERN = /---SCORE---(\d{1,3})---/;

export interface StreamingPromptOutputProps {
  text: string;
  isStreaming: boolean;
  onExplanation: (explanation: string) => void;
  onScore?: (score: number) => void | Promise<void>;
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
}: StreamingPromptOutputProps) {
  const lastExplRef = useRef("");
  const lastScoreRef = useRef<number | null>(null);

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

  return (
    <div className="w-full min-w-0 space-y-2">
      <textarea
        readOnly
        value={optimized}
        rows={12}
        aria-label="Optimized prompt output"
        className="min-h-[200px] w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3.5 font-mono text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      />
      {isStreaming && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Streaming…
        </p>
      )}
    </div>
  );
}
