import { cn } from '@/lib/utils';

/** Lightweight loading placeholder. Purely decorative — aria-hidden. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-white/5', className)}
      {...props}
    />
  );
}
