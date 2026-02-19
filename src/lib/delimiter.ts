export const EXPLANATION_DELIMITER = '---EXPLANATION---';
export const CHANGES_DELIMITER = '---CHANGES---';
export const LEGACY_EXPLANATION_DELIMITER = '---EXPLANATIONS---';

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
      optimizedText: text.slice(0, explIdx).trim(),
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
      optimizedText: text.slice(0, explIdx).trim(),
      explanation: afterExpl,
      changes: '',
      delimiter: EXPLANATION_DELIMITER,
    };
  }

  const legacyIdx = text.indexOf(LEGACY_EXPLANATION_DELIMITER);
  if (legacyIdx !== -1) {
    const afterLegacy = text.slice(legacyIdx + LEGACY_EXPLANATION_DELIMITER.length).trim();
    return {
      optimizedText: text.slice(0, legacyIdx).trim(),
      explanation: afterLegacy,
      changes: '',
      delimiter: LEGACY_EXPLANATION_DELIMITER,
    };
  }

  return { optimizedText: text.trim(), explanation: '', changes: '', delimiter: null };
}

