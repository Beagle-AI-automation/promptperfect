'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ExplanationPanelProps {
  explanation: string;
}

export function ExplanationPanel({ explanation }: ExplanationPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (!explanation) return null;

  const bullets = explanation
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        What changed and why
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {expanded && (
        <ul className="list-disc space-y-1 px-4 pb-4 pl-6 text-sm text-zinc-600 dark:text-zinc-400">
          {bullets.map((b, i) => (
            <li key={i}>{b.replace(/^[-*•]\s*/, '')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
