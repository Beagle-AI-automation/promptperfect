/**
 * Canonical optimization-mode lists. `FEEDBACK_MODES` is the allowlist for
 * any mode value coming back from history rows, deep links, or cross-page
 * payloads (`pp_reoptimize`) — unknown values fall back to `"better"` so a
 * stale/foreign mode can never break the selector or the API call.
 */

import type { OptimizationMode } from '@/lib/types';

export const FEEDBACK_MODES: readonly OptimizationMode[] = [
  'better',
  'specific',
  'cot',
  'developer',
  'research',
  'beginner',
  'product',
  'marketing',
  'production',
] as const;

export function modeFromHistoryRow(mode: string): OptimizationMode {
  const m = mode.trim().toLowerCase();
  return (FEEDBACK_MODES as readonly string[]).includes(m)
    ? (m as OptimizationMode)
    : 'better';
}
