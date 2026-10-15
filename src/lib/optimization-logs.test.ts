import { describe, it, expect } from 'vitest';
import { normalizeModeForDb, parsePromptScore } from './optimization-logs';

describe('normalizeModeForDb', () => {
  it('passes through allowed DB modes case-insensitively', () => {
    expect(normalizeModeForDb('specific')).toBe('specific');
    expect(normalizeModeForDb('COT')).toBe('cot');
    expect(normalizeModeForDb('Production')).toBe('production');
  });

  it('maps every other app mode to better', () => {
    for (const mode of [
      'better',
      'developer',
      'research',
      'beginner',
      'product',
      'marketing',
      'unknown-mode',
    ]) {
      expect(normalizeModeForDb(mode)).toBe('better');
    }
  });
});

describe('parsePromptScore', () => {
  it('parses a valid 1-100 score with or without trailing dashes', () => {
    expect(parsePromptScore('text ---SCORE---87--- more')).toBe(87);
    expect(parsePromptScore('text ---SCORE---5 more')).toBe(5);
    expect(parsePromptScore('---SCORE---100---')).toBe(100);
  });

  it('returns null when missing or out of range', () => {
    expect(parsePromptScore('no score here')).toBeNull();
    expect(parsePromptScore('---SCORE---0---')).toBeNull();
    expect(parsePromptScore('---SCORE---101---')).toBeNull();
    expect(parsePromptScore('')).toBeNull();
  });
});
