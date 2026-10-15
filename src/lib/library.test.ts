import { describe, expect, it } from 'vitest';
import {
  isSavedPromptRow,
  mapLocalLibraryRows,
  modeBadgeLabel,
  previewText,
  rowMatchesModeFilter,
  rowMatchesSearch,
  type SavedPromptRow,
} from './library';

function row(over: Partial<SavedPromptRow> = {}): SavedPromptRow {
  return {
    id: 'r1',
    user_id: 'u1',
    title: 'Title',
    original_prompt: 'original text',
    optimized_prompt: 'optimized text',
    explanation: '',
    mode: 'better',
    provider: 'gemini',
    created_at: new Date().toISOString(),
    ...over,
  };
}

describe('library helpers', () => {
  it('previews and truncates text', () => {
    expect(previewText('  hello   world ')).toBe('hello world');
    expect(previewText('')).toBe('—');
    expect(previewText('x'.repeat(500))).toHaveLength(121);
  });

  it('matches search across title/original/optimized', () => {
    const r = row({ title: 'My plan', original_prompt: 'draft here' });
    expect(rowMatchesSearch(r, '')).toBe(true);
    expect(rowMatchesSearch(r, 'plan')).toBe(true);
    expect(rowMatchesSearch(r, 'DRAFT')).toBe(true);
    expect(rowMatchesSearch(r, 'missing')).toBe(false);
  });

  it('filters by mode including CoT aliases', () => {
    expect(rowMatchesModeFilter(row({ mode: 'better' }), 'better')).toBe(true);
    expect(rowMatchesModeFilter(row({ mode: 'specific' }), 'better')).toBe(false);
    expect(rowMatchesModeFilter(row({ mode: 'chain-of-thought' }), 'cot')).toBe(true);
    expect(rowMatchesModeFilter(row({ mode: 'better' }), 'all')).toBe(true);
  });

  it('labels CoT badges', () => {
    expect(modeBadgeLabel('chain_of_thought')).toBe('CoT');
    expect(modeBadgeLabel('better')).toBe('better');
  });

  it('narrows unknown rows with a type guard', () => {
    expect(isSavedPromptRow(row())).toBe(true);
    expect(isSavedPromptRow(null)).toBe(false);
    expect(isSavedPromptRow({ id: 'x' })).toBe(false);
  });

  it('maps local library rows to server shape', () => {
    const mapped = mapLocalLibraryRows([
      {
        id: 'l1',
        session_id: 's',
        prompt_original: 'a',
        prompt_optimized: 'b',
        mode: 'better',
        explanation: 'e',
        title: 'T',
        provider: 'gemini',
        history_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({ id: 'l1', user_id: 'local', title: 'T' });
  });
});
