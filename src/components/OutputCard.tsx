import { CopyButton } from './CopyButton';

interface OutputCardProps {
  title: string;
  text: string;
  isLoading?: boolean;
  emptyText?: string;
}

export function OutputCard({ title, text, isLoading, emptyText }: OutputCardProps) {
  const display = text.trim();

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
          {title}
        </h2>
        <CopyButton text={display} disabled={isLoading} />
      </div>
      <div className="mt-3">
        {display ? (
          <pre className="whitespace-pre-wrap break-words rounded-2xl bg-white/70 p-4 text-sm leading-7 text-zinc-900 shadow-sm dark:bg-zinc-950/60 dark:text-zinc-50">
            {display}
            {isLoading ? <span className="animate-pulse">▍</span> : null}
          </pre>
        ) : (
          <div className="rounded-2xl bg-white/70 p-4 text-sm text-zinc-500 shadow-sm dark:bg-zinc-950/60 dark:text-zinc-400">
            {isLoading ? 'Generating…' : emptyText ?? 'Nothing yet.'}
          </div>
        )}
      </div>
    </div>
  );
}

