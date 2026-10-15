'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Write `text` to the clipboard. Uses the async Clipboard API with a legacy
 * `execCommand('copy')` fallback for non-secure contexts. Resolves `true` on
 * success, `false` when copying is unavailable or fails.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || !text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * `copied` flips to `true` for `timeoutMs` after a successful `copy()`.
 * Timer is cleaned up on unmount.
 */
export function useCopy(timeoutMs = 2000): {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
} {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      const ok = await copyText(text);
      if (ok) {
        setCopied(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), timeoutMs);
      }
      return ok;
    },
    [timeoutMs],
  );

  return { copied, copy };
}
