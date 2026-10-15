'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn, cvaLite } from '@/lib/utils';

const buttonVariants = cvaLite(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-foreground shadow-sm shadow-accent/10 hover:bg-[#5b6cff]',
        secondary:
          'border border-border bg-transparent text-foreground hover:border-accent/50 hover:bg-accent/5',
        ghost: 'text-foreground hover:bg-white/5',
        outline:
          'border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white',
        danger:
          'bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'min-h-[44px] px-6 py-3 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
