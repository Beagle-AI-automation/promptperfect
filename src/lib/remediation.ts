/**
 * One-click remediation for failed quality checks.
 *
 * `buildRemediationBlock` turns failed `resultInsights` check ids into a
 * directive block appended to the composer input. Re-running the optimizer
 * with it forces the model to repair exactly what the checklist flagged —
 * no manual prompt surgery needed. Pure, unit-tested.
 */

const HEADER =
  '[Refinement pass — the previous version missed the points below. ' +
  'Address every one of them visibly in the improved prompt:]';

const INSTRUCTIONS: Record<string, string> = {
  length:
    '- Length: develop the prompt to a substantive size (aim for several full paragraphs with context, detail, and examples).',
  opener:
    '- Opener: start immediately with substantive content — no (A)/(B) markers, outline labels, or meta headers.',
  structure:
    '- Structure: organize with clear sections a model can follow (headings, numbered steps, or bullets as the mode demands).',
  constraints:
    '- Constraints: state explicit boundaries — what the model must do, must avoid, and hard limits.',
  format:
    '- Output format: name the exact shape of the expected response (JSON, table, word budget, step list, …).',
  success:
    '- Success criteria: define what "good" looks like — a metric, goal, or acceptance check.',
  contract:
    '- Contract hygiene: keep ---EXPLANATION--- and ---CHANGES--- markers out of the prompt body.',
};

/**
 * Build the appended directive block for `failedIds` (unknown ids ignored).
 * Returns `''` when there is nothing to fix.
 */
export function buildRemediationBlock(failedIds: string[]): string {
  const lines = failedIds
    .map((id) => INSTRUCTIONS[id])
    .filter((line): line is string => typeof line === 'string');
  if (lines.length === 0) return '';
  return `\n\n${HEADER}\n${lines.join('\n')}`;
}
