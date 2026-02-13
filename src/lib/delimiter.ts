export const EXPLANATION_DELIMITER = '---EXPLANATION---';
export const LEGACY_EXPLANATION_DELIMITER = '---EXPLANATIONS---';

export interface SplitOptimizedOutputResult {
  optimizedText: string;
  explanation: string;
  /** The delimiter that was found, if any. */
  delimiter: string | null;
}

export function splitOptimizedOutput(text: string): SplitOptimizedOutputResult {
  const idx = text.indexOf(EXPLANATION_DELIMITER);
  if (idx !== -1) {
    return {
      optimizedText: text.slice(0, idx).trim(),
      explanation: text.slice(idx + EXPLANATION_DELIMITER.length).trim(),
      delimiter: EXPLANATION_DELIMITER,
    };
  }

  const legacyIdx = text.indexOf(LEGACY_EXPLANATION_DELIMITER);
  if (legacyIdx !== -1) {
    return {
      optimizedText: text.slice(0, legacyIdx).trim(),
      explanation: text.slice(legacyIdx + LEGACY_EXPLANATION_DELIMITER.length).trim(),
      delimiter: LEGACY_EXPLANATION_DELIMITER,
    };
  }

  return { optimizedText: text.trim(), explanation: '', delimiter: null };
}

