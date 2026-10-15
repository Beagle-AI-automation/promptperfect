'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';

const DiffViewLazy = dynamic(
  () => import('@/components/DiffView').then((m) => ({ default: m.DiffView })),
  { ssr: false, loading: () => <p className="text-[13px] text-[#808088]">Loading diff…</p> },
);

interface ExplanationPanelProps {
  explanation: string;
  original?: string;
  optimized?: string;
}

function isBulletLine(line: string): boolean {
  const t = line.trim();
  return /^[-*•]\s+\S/.test(t) || /^\d+[.)]\s+\S/.test(t);
}

function stripBullet(line: string): string {
  return line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
}

export function ExplanationPanel({
  explanation,
  original = '',
  optimized = '',
}: ExplanationPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'explanation' | 'diff'>('explanation');

  const trimmed = explanation.trim();
  const hasDiffInputs = original.trim().length > 0 || optimized.trim().length > 0;

  if (!trimmed && !hasDiffInputs) return null;

  const lines = trimmed
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const allBullets = lines.length > 0 && lines.every(isBulletLine);

  return (
    <div className="rounded-[12px] border border-[#1e1e1e] bg-[#0d0d0d] px-6 py-5 transition-colors duration-200 ease-out">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 flex-1 items-center justify-between text-left transition hover:bg-[#111]/50"
        >
          <span className="text-[13px] font-medium uppercase tracking-[0.06em] text-[#808088]">
            What changed and why
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[#808088]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#808088]" />
          )}
        </button>
        {hasDiffInputs && (
          <SegmentedToggle
            aria-label="View mode"
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'explanation', label: 'Explanation' },
              { value: 'diff', label: 'Diff View' },
            ]}
          />
        )}
      </div>
      {expanded && (
        <div className="mt-4 border-t border-[#1e1e1e] pt-4">
          {viewMode === 'diff' && hasDiffInputs ? (
            <DiffViewLazy original={original} optimized={optimized} />
          ) : trimmed ? (
            allBullets ? (
              <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-[1.7] text-[#aaa] marker:text-[#808088]">
                {lines.map((line, i) => (
                  <li key={i}>{stripBullet(line)}</li>
                ))}
              </ul>
            ) : lines.length === 1 ? (
              <p className="whitespace-pre-wrap text-[14px] leading-[1.7] text-[#aaa]">
                {lines[0]}
              </p>
            ) : (
              <div className="whitespace-pre-wrap text-[14px] leading-[1.7] text-[#aaa]">
                {trimmed}
              </div>
            )
          ) : (
            <p className="text-[14px] text-[#808088]">No explanation for this run.</p>
          )}
        </div>
      )}
    </div>
  );
}
