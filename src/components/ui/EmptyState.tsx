import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional call-to-action rendered under the description (e.g. a Button). */
  action?: ReactNode;
  /** Tighter vertical padding for use inside compact shells. */
  compact?: boolean;
  className?: string;
}

/**
 * Shared empty-state: a bordered icon tile, a title, an optional description,
 * and an optional action. Used across history, analytics and library panels
 * so empty surfaces look like the same product.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2.5 px-6 text-center',
        compact ? 'py-6' : 'py-10',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted">
        <Icon className="h-5 w-5 text-[#3a3a3a]" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="text-[13px] font-medium text-[#B0B0B0]">{title}</p>
      {description ? (
        <p className="max-w-[260px] text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
