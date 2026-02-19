/**
 * Heuristic prompt quality score (0-100).
 * Designed to be fast and deterministic (no LLM calls).
 */
export function scorePrompt(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let score = 0;

  // Length (0-35): sweet spot 15-80 words
  if (wordCount < 3) score += 5;
  else if (wordCount < 10) score += 15;
  else if (wordCount < 20) score += 25;
  else if (wordCount <= 80) score += 35;
  else if (wordCount <= 150) score += 28;
  else score += 20;

  // Structure (0-25): steps, bullets, line breaks, questions
  const hasNumbers = /\d+[\.\)]\s|\b(step|first|second|third|1\.|2\.)\b/i.test(trimmed);
  const hasBullets = /^[\s]*[-*•]\s/m.test(trimmed) || /\n[-*•]\s/m.test(trimmed);
  const hasLineBreaks = trimmed.includes('\n');
  const hasQuestion = trimmed.includes('?');
  const structurePoints = [hasNumbers, hasBullets, hasLineBreaks, hasQuestion].filter(Boolean).length;
  score += Math.min(25, structurePoints * 8);

  // Specificity (0-25): action verbs + fewer vague words
  const vagueWords = /\b(thing|stuff|something|do|make|get|help)\b/gi;
  const vagueCount = (trimmed.match(vagueWords) || []).length;
  const actionVerbs = /\b(write|create|explain|analyze|compare|summarize|list|describe|define|refactor|debug|fix)\b/gi;
  const actionCount = (trimmed.match(actionVerbs) || []).length;
  score += Math.min(25, Math.max(0, 10 + actionCount * 3 - vagueCount * 2));

  // Constraints & format hints (0-10)
  const hasConstraints =
    /\b(must|should|avoid|only|exactly|limit|format|json|markdown|bullet|steps?)\b/i.test(trimmed);
  score += hasConstraints ? 10 : 0;

  // Word variety (0-5)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  const varietyRatio = wordCount > 0 ? uniqueWords / wordCount : 0;
  score += Math.min(5, Math.round(varietyRatio * 8));

  return Math.min(100, Math.max(0, Math.round(score)));
}

