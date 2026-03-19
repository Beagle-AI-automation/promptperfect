"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";

const DiffViewLazy = dynamic(
  () => import("@/components/DiffView").then((m) => ({ default: m.DiffView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Loading diff…
      </div>
    ),
  }
);

export interface PromptOutputProps {
  optimized: string;
  explanation: string;
  original: string;
}

export function PromptOutput({
  optimized,
  explanation,
  original,
}: PromptOutputProps) {
  const [viewMode, setViewMode] = useState<"explanation" | "diff">("explanation");

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Result
        </span>
        <div
          className="flex rounded-lg border border-zinc-300 dark:border-zinc-600"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            onClick={() => setViewMode("explanation")}
            aria-pressed={viewMode === "explanation"}
            className={`rounded-l-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
              viewMode === "explanation"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Explanation
          </button>
          <button
            type="button"
            onClick={() => setViewMode("diff")}
            aria-pressed={viewMode === "diff"}
            className={`rounded-r-md border-l border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-600 dark:focus:ring-offset-zinc-900 ${
              viewMode === "diff"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Diff View
          </button>
        </div>
      </div>
      {viewMode === "explanation" ? (
        <div className="min-h-[120px] rounded-xl border border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="prose prose-zinc max-w-none dark:prose-invert prose-p:text-sm prose-p:leading-relaxed prose-pre:bg-zinc-100 prose-pre:text-zinc-900 dark:prose-pre:bg-zinc-800 dark:prose-pre:text-zinc-100">
            <ReactMarkdown>
              {explanation || "_No explanation provided._"}
            </ReactMarkdown>
          </div>
          {optimized && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Optimized prompt
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-100 p-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                {optimized}
              </pre>
            </details>
          )}
        </div>
      ) : (
        <DiffViewLazy original={original} optimized={optimized} />
      )}
    </div>
  );
}
