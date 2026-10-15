'use client';

import { useMemo } from 'react';
import { AlertTriangle, Check, Download, Wand2, X } from 'lucide-react';
import type { Provider } from '@/lib/types';
import { analyzeResult } from '@/lib/resultInsights';
import { buildRemediationBlock } from '@/lib/remediation';

interface ResultComplementsProps {
  original: string;
  /** Optimized text with section markers already stripped. */
  optimized: string;
  explanation: string;
  mode: string;
  provider: Provider;
  modelId?: string;
  /** When set, failed checks get a one-click "fix & re-run" button. */
  onRemediate?: (directiveBlock: string) => void;
}

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400',
  B: 'bg-accent/20 text-[#8B9AFF]',
  C: 'bg-amber-500/20 text-amber-400',
  D: 'bg-red-500/20 text-red-400',
};

function downloadMarkdown(filename: string, markdown: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export function ResultComplements({
  original,
  optimized,
  explanation,
  mode,
  provider,
  modelId,
  onRemediate,
}: ResultComplementsProps) {
  const insights = useMemo(
    () => analyzeResult(original, optimized, provider, modelId, mode),
    [original, optimized, provider, modelId, mode],
  );

  if (!optimized.trim()) return null;

  const failedIds = insights.checks.filter((c) => !c.passed).map((c) => c.id);

  const date = new Date().toISOString().slice(0, 10);
  const markdown = [
    `# Optimized prompt (${mode} · ${provider}${modelId ? ` · ${modelId}` : ''})`,
    '',
    optimized.trim(),
    '',
    ...(explanation.trim() ? ['## Why these changes', '', explanation.trim(), ''] : []),
    `---\nGenerated with PromptPerfect · quality ${insights.score}/100 (${insights.grade}) · ${date}`,
    '',
  ].join('\n');

  return (
    <div className="mt-3 w-full rounded-xl border border-[#252525] bg-white/[0.02] p-3">
      {/* Meta chips */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className={`rounded px-2 py-0.5 font-semibold ${GRADE_STYLES[insights.grade] ?? GRADE_STYLES.B}`}
          title={`Heuristic quality score: ${insights.score}/100`}
        >
          Quality {insights.grade} · {insights.score}
        </span>
        <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[#B0B0B0]">
          {insights.inputTokens} → {insights.outputTokens} tokens (est.)
        </span>
        <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[#B0B0B0]">
          {insights.costUsd === null
            ? 'Cost —'
            : `Cost ≈ $${insights.costUsd < 0.01 ? insights.costUsd.toFixed(4) : insights.costUsd.toFixed(2)}${insights.costEstimated ? ' (est.)' : ''}`}
        </span>
        <span
          className={`rounded px-2 py-0.5 ${
            insights.placeholders.length > 0
              ? 'bg-amber-500/20 font-semibold text-amber-400'
              : 'bg-white/[0.06] text-[#8a8a8a]'
          }`}
        >
          {insights.placeholders.length > 0
            ? `${insights.placeholders.length} placeholder${insights.placeholders.length === 1 ? '' : 's'} to fill`
            : 'No placeholders'}
        </span>
        <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[#B0B0B0]">
          {insights.passedCount}/{insights.checks.length} checks
        </span>
        <button
          type="button"
          onClick={() => downloadMarkdown(`promptperfect-${mode}-${date}.md`, markdown)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-2.5 py-1 font-medium text-[#B0B0B0] transition hover:border-accent/50 hover:text-[#ECECEC]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Download .md
        </button>
      </div>

      {/* One-click remediation for failed checks */}
      {onRemediate && failedIds.length > 0 ? (
        <button
          type="button"
          onClick={() => onRemediate(buildRemediationBlock(failedIds))}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-[#8B9AFF] transition hover:bg-accent/25"
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Fix {failedIds.length} issue{failedIds.length === 1 ? '' : 's'} & re-run
        </button>
      ) : null}

      {/* Placeholder guard */}
      {insights.placeholders.length > 0 ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-amber-400" role="alert">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Fill before using: {insights.placeholders.map((p) => `{{${p}}}`).join(', ')}
          </span>
        </p>
      ) : null}

      {/* Quality checklist */}
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-[#8a8a8a] transition-colors hover:text-[#B0B0B0]">
          Quality checklist ({insights.passedCount}/{insights.checks.length} passed)
        </summary>
        <ul className="mt-2 space-y-1.5">
          {insights.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              {c.passed ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" aria-hidden />
              ) : (
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden />
              )}
              <span>
                <span className={c.passed ? 'text-[#B0B0B0]' : 'font-medium text-[#ECECEC]'}>
                  {c.label}
                </span>
                {!c.passed ? (
                  <span className="block text-[#8a8a8a]">{c.hint}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
