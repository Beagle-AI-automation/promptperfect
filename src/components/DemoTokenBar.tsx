'use client';

interface DemoTokenBarProps {
  tokensUsed: number;
  tokenLimit: number;
  isGuest: boolean;
}

export function DemoTokenBar({ tokensUsed, tokenLimit, isGuest }: DemoTokenBarProps) {
  const displayUsed = Math.min(tokensUsed, tokenLimit);
  const remaining = Math.max(0, tokenLimit - tokensUsed);
  const pct = tokenLimit > 0 ? (displayUsed / tokenLimit) * 100 : 0;
  const barColor =
    remaining === 0 ? 'bg-red-500' : pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-green-500';

  const label = isGuest
    ? '50 free demo tokens'
    : '100 free tokens';

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-zinc-400">
          {label} — <span className="text-[#ECECEC]">{displayUsed}</span> used
          {' | '}
          <span className="text-[#ECECEC]">{remaining}</span> remaining
          {remaining === 0 && tokensUsed > tokenLimit && (
            <span className="ml-1.5 text-amber-400">(limit reached)</span>
          )}
        </span>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-zinc-700">
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
