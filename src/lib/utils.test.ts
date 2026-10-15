import { describe, it, expect } from 'vitest';
import { cn, cvaLite } from './utils';

describe('cn', () => {
  it('joins truthy class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('filters out falsy values', () => {
    expect(cn('a', null, undefined, false, '', 'b')).toBe('a b');
  });

  it('flattens nested arrays', () => {
    expect(cn('a', ['b', ['c']], 'd')).toBe('a b c d');
  });

  it('keeps object keys whose value is truthy', () => {
    expect(cn('a', { b: true, c: false, d: 1 })).toBe('a b d');
  });

  it('returns empty string when nothing is provided', () => {
    expect(cn()).toBe('');
  });

  it('resolves conflicting Tailwind utilities, last one wins', () => {
    // tailwind-merge may reorder, so compare as a set (px-2 is dropped).
    expect(cn('px-2 py-1', 'px-4').split(' ').sort()).toEqual([
      'px-4',
      'py-1',
    ]);
    expect(cn('rounded-md', 'rounded-full')).toBe('rounded-full');
  });
});

describe('cvaLite', () => {
  const btn = cvaLite('base', {
    variants: {
      variant: { primary: 'text-white', ghost: 'text-black' },
      size: { sm: 'h-8', lg: 'h-12' },
    },
    defaultVariants: { variant: 'primary', size: 'sm' },
  });

  it('applies default variants', () => {
    expect(btn()).toBe('base text-white h-8');
  });

  it('applies explicit variants', () => {
    expect(btn({ variant: 'ghost', size: 'lg' })).toBe(
      'base text-black h-12',
    );
  });

  it('appends className last so callers can override', () => {
    expect(btn({ className: 'mt-2' })).toBe('base text-white h-8 mt-2');
  });

  it('ignores an unknown variant value instead of emitting undefined', () => {
    // `nope` is not in the size map, so `mapped` is undefined and the key is
    // skipped entirely rather than stringified into the output.
    expect(btn({ size: 'nope' })).toBe('base text-white');
  });

  it('ignores an empty-string variant value', () => {
    expect(btn({ variant: '' })).toBe('base h-8');
  });

  it('ignores props that are not declared variants', () => {
    // Extra keys are caller-supplied data, not variants; they must not leak
    // into the class string.
    expect(btn({ tone: 'loud' })).toBe('base text-white h-8');
  });

  it('works with no variants declared at all', () => {
    const plain = cvaLite('base', { variants: {} });
    expect(plain()).toBe('base');
    expect(plain({ className: 'mt-2' })).toBe('base mt-2');
  });
});

describe('cvaLite compound variants', () => {
  const alert = cvaLite('base', {
    variants: {
      tone: { info: 'text-blue', warn: 'text-amber' },
      solid: { yes: 'bg-blue', no: 'bg-transparent' },
    },
    defaultVariants: { tone: 'info', solid: 'no' },
    compoundVariants: [
      { tone: 'warn', solid: 'yes', class: 'ring-amber' },
      { tone: 'info', className: 'ring-blue' },
    ],
  });

  it('applies the compound class when every condition matches', () => {
    expect(alert({ tone: 'warn', solid: 'yes' })).toBe(
      'base text-amber bg-blue ring-amber',
    );
  });

  it('applies the compound that matches the defaults', () => {
    expect(alert()).toBe('base text-blue bg-transparent ring-blue');
  });

  it('applies nothing when no compound matches', () => {
    expect(alert({ tone: 'warn' })).toBe('base text-amber bg-transparent');
  });

  it('accepts className as well as class in a compound', () => {
    // The second compound uses `className`; both spellings must work.
    expect(alert({ tone: 'info', solid: 'yes' })).toBe(
      'base text-blue bg-blue ring-blue',
    );
  });

  it('ignores a compound that declares neither class nor className', () => {
    const odd = cvaLite('base', {
      variants: { a: { x: 'ax' } },
      defaultVariants: { a: 'x' },
      compoundVariants: [{ a: 'x' }],
    });
    // The empty string pushed for a classless compound is dropped by cn.
    expect(odd()).toBe('base ax');
  });
});
