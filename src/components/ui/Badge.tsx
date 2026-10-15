import type { HTMLAttributes } from 'react';
import { cn, cvaLite } from '@/lib/utils';

const badgeVariants = cvaLite(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-accent/30 bg-accent/10 text-accent-text',
        muted: 'border-border bg-muted text-muted-foreground',
        success: 'border-green-500/30 bg-green-500/10 text-green-400',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        danger: 'border-red-500/30 bg-red-500/10 text-red-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'muted' | 'success' | 'warning' | 'danger';
}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { badgeVariants };
