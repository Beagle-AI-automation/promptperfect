import { describe, it, expect } from 'vitest';
import {
  CHANGES_DELIMITER,
  EXPLANATION_DELIMITER,
  LEGACY_EXPLANATION_DELIMITER,
  splitOptimizedOutput,
  stripPromptScoreMarkers,
} from './delimiter';

describe('stripPromptScoreMarkers', () => {
  it('removes score markers with and without trailing dashes', () => {
    expect(stripPromptScoreMarkers('Do X. ---SCORE---87---')).toBe('Do X.');
    expect(stripPromptScoreMarkers('Do X. ---SCORE---87')).toBe('Do X.');
    expect(stripPromptScoreMarkers('No marker here')).toBe('No marker here');
  });

  it('removes a leading outline letter prefix', () => {
    expect(stripPromptScoreMarkers('(A) The objective: do X.')).toBe(
      'The objective: do X.',
    );
  });
});

describe('splitOptimizedOutput', () => {
  it('splits optimized text, explanation and changes', () => {
    const raw = [
      'Improved prompt here.',
      EXPLANATION_DELIMITER,
      'Why it is better.',
      CHANGES_DELIMITER,
      '- Clarified the task',
    ].join('\n');
    const out = splitOptimizedOutput(raw);
    expect(out).toMatchObject({
      optimizedText: 'Improved prompt here.',
      explanation: 'Why it is better.',
      changes: '- Clarified the task',
      delimiter: EXPLANATION_DELIMITER,
    });
  });

  it('handles explanation without a changes section', () => {
    const raw = `Prompt.\n${EXPLANATION_DELIMITER}\nJust why.`;
    const out = splitOptimizedOutput(raw);
    expect(out).toMatchObject({
      optimizedText: 'Prompt.',
      explanation: 'Just why.',
      changes: '',
      delimiter: EXPLANATION_DELIMITER,
    });
  });

  it('supports the legacy explanations delimiter', () => {
    const raw = `Prompt.\n${LEGACY_EXPLANATION_DELIMITER}\nLegacy why.`;
    const out = splitOptimizedOutput(raw);
    expect(out).toMatchObject({
      optimizedText: 'Prompt.',
      explanation: 'Legacy why.',
      delimiter: LEGACY_EXPLANATION_DELIMITER,
    });
  });

  it('returns the whole text as optimized when no delimiter exists', () => {
    const out = splitOptimizedOutput('  Plain output ---SCORE---72---  ');
    expect(out).toMatchObject({
      optimizedText: 'Plain output',
      explanation: '',
      changes: '',
      delimiter: null,
    });
  });
});
