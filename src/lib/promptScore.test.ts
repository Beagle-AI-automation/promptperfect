import { describe, it, expect } from 'vitest';
import { scorePrompt } from './promptScore';

describe('scorePrompt', () => {
  it('returns 0 for empty or whitespace-only input', () => {
    expect(scorePrompt('')).toBe(0);
    expect(scorePrompt('   \n  ')).toBe(0);
  });

  it('scores a very short vague prompt low', () => {
    expect(scorePrompt('hi')).toBeLessThanOrEqual(20);
    expect(scorePrompt('help')).toBeLessThan(30);
  });

  it('scores a structured, specific prompt high', () => {
    const prompt =
      'Write a technical spec for a rate limiter. Steps: 1) define limits 2) ' +
      'choose an algorithm 3) handle burst traffic. Format the output as markdown. ' +
      'Compare token-bucket vs sliding-window and list trade-offs.';
    expect(scorePrompt(prompt)).toBeGreaterThanOrEqual(80);
  });

  it('always returns an integer within 0-100 for varied inputs', () => {
    const samples = [
      'Explain recursion to a beginner with examples.',
      'a',
      'write; write; write;',
      'Analyze the attached logs. Use bullet points. Must be concise.',
      'word '.repeat(400),
    ];
    for (const s of samples) {
      const score = scorePrompt(s);
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('rewards structure: same words with bullets/numbering score higher', () => {
    const flat = 'define the scope then analyze the risks and compare options please';
    const structured =
      '- define the scope\n- analyze the risks\n- compare options';
    expect(scorePrompt(structured)).toBeGreaterThan(scorePrompt(flat));
  });
});
