import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Canonical shadcn/ui class helper: `clsx` joins conditional classes and
 * `tailwind-merge` de-duplicates conflicting Tailwind utilities so the
 * last one wins. This lets primitives expose overridable variants (radius,
 * spacing, colors) via `className` without conflicting-class bugs.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };

type VariantShape = Record<string, Record<string, string | undefined>>;

interface VariantConfig<V extends VariantShape> {
  variants: V;
  compoundVariants?: Array<
    Partial<Record<keyof V, string>> & { class?: string; className?: string }
  >;
  defaultVariants?: Partial<Record<keyof V, string>>;
}

/**
 * Minimal cva-style variant helper: builds a class string from a base class,
 * variant maps, and compound variants. Matches the shadcn/ui usage surface so
 * components can be swapped to real cva later without edits.
 */
export function cvaLite<V extends VariantShape>(
  base: string,
  config: VariantConfig<V>,
) {
  return (props?: {
    variant?: string;
    size?: string;
    className?: string;
  } & Record<string, string | undefined>): string => {
    const selected: Record<string, string> = {};
    for (const key of Object.keys(config.variants)) {
      const value =
        props?.[key] ?? config.defaultVariants?.[key] ?? undefined;
      if (value) {
        const mapped = config.variants[key]?.[value];
        if (mapped) selected[key] = mapped;
      }
    }
    const parts: string[] = [base, ...Object.values(selected)];
    for (const cv of config.compoundVariants ?? []) {
      const matches = Object.entries(cv).every(([k, v]) => {
        if (k === 'class' || k === 'className') return true;
        const value = props?.[k] ?? config.defaultVariants?.[k];
        return value === v;
      });
      if (matches) parts.push(cv.class ?? cv.className ?? '');
    }
    if (props?.className) parts.push(props.className);
    return cn(...parts);
  };
}
