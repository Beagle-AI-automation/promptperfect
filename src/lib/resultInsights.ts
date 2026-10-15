/**
 * Deterministic result enrichments for the optimizer output — no LLM calls.
 * Builds on the existing `scorePrompt` heuristic: quality checklist, unfilled
 * `{{PLACEHOLDER}}` detection, token estimates, and cost estimates where
 * pricing is known. Pure functions, fully unit-tested.
 */

import type { Provider } from '@/lib/types';
import { scorePrompt } from '@/lib/promptScore';

export interface QualityCheck {
  id: string;
  label: string;
  passed: boolean;
  hint: string;
}

/** Token heuristic shared with the composer (chars / 4, minimum 1 when non-empty). */
export function estimateTokens(text: string): number {
  const len = text.trim().length;
  return len === 0 ? 0 : Math.max(1, Math.ceil(len / 4));
}

/** All `{{PLACEHOLDER}}` names in order of first appearance, deduplicated. */
export function findPlaceholders(text: string): string[] {
  const seen: string[] = [];
  const re = /\{\{\s*([A-Za-z0-9_ ]{1,60})\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1];
    if (raw === undefined) continue;
    const name = raw.trim();
    if (name && !seen.includes(name)) seen.push(name);
  }
  return seen;
}

export type QualityGrade = 'A' | 'B' | 'C' | 'D';

export function gradeForScore(score: number): QualityGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Best-practice checklist evaluated against the optimized prompt. */
export function qualityChecks(optimized: string, mode?: string): QualityCheck[] {
  const t = optimized.trim();
  const words = wordCount(t);
  const startsBanned = /^(\([A-C]\)|region\s+\d|section\s+[A-C]|optimized prompt\s*:)/i.test(t);
  const hasNumbers = /(^|\n)\s*\d+[.)]\s/m.test(t);
  const hasBullets = /(^|\n)\s*[-*•]\s/m.test(t);
  const hasHeadings = /(^|\n)\s*#{1,3}\s/m.test(t);
  // "better" mode mandates flowing paragraphs (no bullets) by design, so its
  // structure bar is paragraph depth — not bullet/step markers.
  // "cot" mode mandates numbered steps.
  const m = (mode ?? '').trim().toLowerCase();
  const paragraphs = t
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hasStructure =
    m === 'better'
      ? paragraphs.length >= 3 && words >= 60
      : m === 'cot'
        ? hasNumbers
        : hasNumbers || hasBullets || hasHeadings;
  const hasConstraints =
    /\b(must|must not|should|avoid|only|exactly|limit|≤|<=|max\b|at least|never)\b/i.test(t);
  const hasFormat =
    /\b(json|markdown|table|bullets?|numbered|≤\s?\d+\s?words?|\d+\s?words?\s?max|characters?|steps?|line breaks?|syllables?)\b/i.test(t);
  const hasSuccess =
    /\b(success|metric|goal|criteria|acceptance|acceptance tests?|definition of done|done when|targets|kpi)\b/i.test(
      t,
    );
  const noLeakedMarkers = !/---(EXPLANATION|CHANGES|SCORE)---/.test(t);

  return [
    {
      id: 'length',
      label: 'Substantive length (30–3000 words)',
      passed: words >= 30 && words <= 3000,
      hint: words < 30 ? 'Too thin — add context, constraints, and examples.' : 'Overlong — tighten scope and cut redundancy.',
    },
    {
      id: 'opener',
      label: 'Clean opener (no outline markers)',
      passed: !startsBanned,
      hint: 'Starts with (A)/(B) or a meta label — the app contract forbids these.',
    },
    {
      id: 'structure',
      label: m === 'better' ? 'Paragraph depth (3+ substantive paragraphs)' : 'Scannable structure',
      passed: hasStructure,
      hint:
        m === 'better'
          ? 'Better mode writes flowing paragraphs — give it 3+ developed paragraphs.'
          : m === 'cot'
            ? 'Chain-of-thought needs numbered steps (1., 2., 3.).'
            : 'Add headings, numbered steps, or bullets so the model can follow sections.',
    },
    {
      id: 'constraints',
      label: 'Explicit constraints',
      passed: hasConstraints,
      hint: 'State must/avoid/limits so output stays in bounds.',
    },
    {
      id: 'format',
      label: 'Output format specified',
      passed: hasFormat,
      hint: 'Name the shape: JSON, table, word budget, or step list.',
    },
    {
      id: 'success',
      label: 'Success criteria defined',
      passed: hasSuccess,
      hint: 'Define what "good" looks like: metric, goal, or acceptance check.',
    },
    {
      id: 'contract',
      label: 'No leaked section markers',
      passed: noLeakedMarkers,
      hint: 'Contains ---EXPLANATION---/---CHANGES--- inside the prompt body.',
    },
  ];
}

/**
 * Per-1M-token USD pricing. Only models with a known figure are listed;
 * everything else yields `null` (UI shows "—" instead of guessing).
 * gpt-6-astra figures are third-party estimates (Sep 2026).
 */
const PRICING_PER_1M: Partial<
  Record<string, { input: number; output: number; estimated?: boolean }>
> = {
  'gpt-6-astra': { input: 10, output: 50, estimated: true },
};

/** Estimated USD cost for a run, or null when pricing is unknown. */
export function estimateCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const p = PRICING_PER_1M[modelId.trim().toLowerCase()];
  if (!p) return null;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function isEstimatedPricing(modelId: string): boolean {
  return PRICING_PER_1M[modelId.trim().toLowerCase()]?.estimated === true;
}

export interface ResultInsights {
  score: number;
  grade: QualityGrade;
  checks: QualityCheck[];
  passedCount: number;
  placeholders: string[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  costEstimated: boolean;
}

export function analyzeResult(
  input: string,
  optimized: string,
  provider: Provider,
  modelId?: string,
  mode?: string,
): ResultInsights {
  const checks = qualityChecks(optimized, mode);
  const inputTokens = estimateTokens(input);
  const outputTokens = estimateTokens(optimized);
  const key = (modelId ?? '').trim() || defaultModelFor(provider);
  return {
    score: scorePrompt(optimized),
    grade: gradeForScore(scorePrompt(optimized)),
    checks,
    passedCount: checks.filter((c) => c.passed).length,
    placeholders: findPlaceholders(optimized),
    inputTokens,
    outputTokens,
    costUsd: estimateCostUsd(key, inputTokens, outputTokens),
    costEstimated: isEstimatedPricing(key),
  };
}

function defaultModelFor(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-6-astra';
    case 'anthropic':
      return 'claude-3-5-haiku-latest';
    default:
      return 'gemini-3.5-flash';
  }
}
