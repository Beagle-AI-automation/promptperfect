import { scorePrompt } from '@/lib/promptScore';
import { OdometerNumber } from '@/components/OdometerNumber';

interface PromptScoreRowProps {
  originalText: string;
  optimizedText: string;
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-rose-400';
}

export function PromptScoreRow({ originalText, optimizedText }: PromptScoreRowProps) {
  const original = scorePrompt(originalText);
  const optimized = scorePrompt(optimizedText);
  const delta = optimized - original;
  const total = 100;
  const progress = Math.max(0, Math.min(1, optimized / total));

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">
          Accuracy test
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Original</span>
          <span className={`text-sm font-semibold tabular-nums ${scoreColor(original)}`}>
            <OdometerNumber value={original} />
          </span>
        </div>

        <span className="text-zinc-300 dark:text-zinc-700">→</span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Perfected</span>
          <span className={`text-sm font-semibold tabular-nums ${scoreColor(optimized)}`}>
            <OdometerNumber value={optimized} />
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Change</span>
          <span
            className={[
              'text-sm font-semibold tabular-nums',
              delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-zinc-400',
            ].join(' ')}
          >
            <OdometerNumber value={delta} />
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 w-full rounded-full bg-zinc-200/60 dark:bg-zinc-800/60">
        <div
          className="h-2 rounded-full bg-zinc-950/80 transition-[width] duration-500 dark:bg-white/80"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

