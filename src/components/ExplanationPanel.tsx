'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ExplanationPanelProps {
  explanation: string;
}

const BULLET_PREFIXES = /^[-*]\s+/;

function parseExplanationToItems(text: string): Array<{ type: 'bullet'; content: string } | { type: 'paragraph'; content: string }> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n/);
  const items: Array<{ type: 'bullet'; content: string } | { type: 'paragraph'; content: string }> = [];

  for (const line of lines) {
    const bulletMatch = line.match(BULLET_PREFIXES);
    if (bulletMatch) {
      items.push({ type: 'bullet', content: line.replace(BULLET_PREFIXES, '').trim() });
    } else if (line.trim()) {
      items.push({ type: 'paragraph', content: line.trim() });
    }
  }

  return items;
}

export function ExplanationPanel({ explanation }: ExplanationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasContent = Boolean(explanation.trim());
  const wasEmptyRef = useRef(true);

  useEffect(() => {
    if (hasContent && wasEmptyRef.current) {
      setIsExpanded(true);
      wasEmptyRef.current = false;
    } else if (!hasContent) {
      setIsExpanded(false);
      wasEmptyRef.current = true;
    }
  }, [hasContent]);

  const items = parseExplanationToItems(explanation);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/60 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/40">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left transition hover:bg-white/30 dark:hover:bg-zinc-950/30"
      >
        <h2 className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
          What changed and why
        </h2>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-200 px-4 pb-4 pt-3 dark:border-zinc-800">
          {hasContent ? (
            <ul className="space-y-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {items.map((item, i) =>
                item.type === 'bullet' ? (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    <span>{item.content}</span>
                  </li>
                ) : (
                  <li key={i} className="pl-3.5">
                    {item.content}
                  </li>
                )
              )}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No changes yet. Optimize a prompt to see what changed from your original to the improved version.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
