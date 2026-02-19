'use client';

import { Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const EXPLANATION_DELIMITER = '---EXPLANATION---';
const SCORE_PATTERN = /---SCORE---(\d{1,3})---/;

interface PromptOutputProps {
  text: string;
  isStreaming: boolean;
  onExplanation?: (explanation: string) => void;
  onScore?: (score: number) => void;
}

export function PromptOutput({
  text,
  isStreaming,
  onExplanation,
  onScore,
}: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const sentRef = useRef(false);
  const scoreSentRef = useRef(false);

  const explIdx = text.indexOf(EXPLANATION_DELIMITER);
  let beforeExplanation = explIdx !== -1 ? text.slice(0, explIdx) : text;
  const explanation =
    explIdx !== -1 ? text.slice(explIdx + EXPLANATION_DELIMITER.length).trim() : '';

  const scoreMatch = beforeExplanation.match(SCORE_PATTERN);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  const displayText = scoreMatch
    ? beforeExplanation.replace(SCORE_PATTERN, '').trim()
    : beforeExplanation.trim();

  useEffect(() => {
    if (!text) {
      sentRef.current = false;
      scoreSentRef.current = false;
    }
  }, [text]);

  useEffect(() => {
    if (explanation && onExplanation && !sentRef.current) {
      sentRef.current = true;
      onExplanation(explanation);
    }
  }, [explanation, onExplanation]);

  useEffect(() => {
    if (score !== null && onScore && !scoreSentRef.current) {
      scoreSentRef.current = true;
      onScore(Math.min(100, Math.max(1, score)));
    }
  }, [score, onScore]);

  const handleCopy = async () => {
    if (!displayText) return;
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const scoreColor =
    score !== null
      ? score >= 80
        ? 'stroke-green-500 dark:stroke-green-400'
        : score >= 50
          ? 'stroke-amber-500 dark:stroke-amber-400'
          : 'stroke-red-500 dark:stroke-red-400'
      : '';

  return (
    <div className="flex flex-col">
      <pre className="h-[400px] w-full resize-none overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 whitespace-pre-wrap break-words dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
        {displayText}
        {isStreaming && <span className="animate-pulse">▍</span>}
      </pre>
      <div className="mt-2 flex items-center justify-between">
        {score !== null ? (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  strokeWidth="3"
                  className="stroke-zinc-200 dark:stroke-zinc-700"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  strokeWidth="3"
                  strokeDasharray={`${(score / 100) * 88} 88`}
                  strokeLinecap="round"
                  className={`transition-all duration-500 ${scoreColor}`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                {score}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Quality score
              </span>
              <span
                className={`text-sm font-semibold ${
                  score >= 80
                    ? 'text-green-600 dark:text-green-400'
                    : score >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                {score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs work'}
              </span>
            </div>
          </div>
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          onClick={handleCopy}
          disabled={!displayText}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <Copy className="mr-1 inline h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
