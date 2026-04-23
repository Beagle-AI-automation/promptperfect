export const EXPLANATION_DELIMITER = '---EXPLANATION---';
export const CHANGES_DELIMITER = '---CHANGES---';
export const LEGACY_EXPLANATION_DELIMITER = '---EXPLANATIONS---';

/**
 * Removes optional ---SCORE---NN--- lines the model may emit (with or without
 * trailing ---). Never show this to users as part of the optimized prompt.
 */
export const PROMPT_SCORE_STRIP_GLOBAL = /---SCORE---\d{1,3}(?:---)?/g;

/** Models sometimes echo outline labels like "(A) The objective…" from instruction templates. */
const LEADING_OUTLINE_LETTER_PREFIX = /^\s*\([A-Z]\)\s+/u;

export function stripPromptScoreMarkers(text: string): string {
  let t = text.replace(PROMPT_SCORE_STRIP_GLOBAL, '').trim();
  t = t.replace(LEADING_OUTLINE_LETTER_PREFIX, '');
  return t.trim();
}

export interface SplitOptimizedOutputResult {
  optimizedText: string;
  /** Detailed explanation of the optimized prompt (what it means, what it achieves). */
  explanation: string;
  /** Bullet list of what changed from original prompt to optimized. */
  changes: string;
  /** The delimiter that was found, if any. */
  delimiter: string | null;
}

export function splitOptimizedOutput(text: string): SplitOptimizedOutputResult {
  const explIdx = text.indexOf(EXPLANATION_DELIMITER);
  const changesIdx = text.indexOf(CHANGES_DELIMITER);

  if (explIdx !== -1 && changesIdx !== -1 && changesIdx > explIdx) {
    return {
      optimizedText: stripPromptScoreMarkers(text.slice(0, explIdx).trim()),
      explanation: text
        .slice(explIdx + EXPLANATION_DELIMITER.length, changesIdx)
        .trim(),
      changes: text.slice(changesIdx + CHANGES_DELIMITER.length).trim(),
      delimiter: EXPLANATION_DELIMITER,
    };
  }

  if (explIdx !== -1) {
    const afterExpl = text.slice(explIdx + EXPLANATION_DELIMITER.length).trim();
    return {
      optimizedText: stripPromptScoreMarkers(text.slice(0, explIdx).trim()),
      explanation: afterExpl,
      changes: '',
      delimiter: EXPLANATION_DELIMITER,
    };
  }

  const legacyIdx = text.indexOf(LEGACY_EXPLANATION_DELIMITER);
  if (legacyIdx !== -1) {
    const afterLegacy = text.slice(legacyIdx + LEGACY_EXPLANATION_DELIMITER.length).trim();
    return {
      optimizedText: stripPromptScoreMarkers(text.slice(0, legacyIdx).trim()),
      explanation: afterLegacy,
      changes: '',
      delimiter: LEGACY_EXPLANATION_DELIMITER,
    };
  }

  return {
    optimizedText: stripPromptScoreMarkers(text.trim()),
    explanation: '',
    changes: '',
    delimiter: null,
  };
}

