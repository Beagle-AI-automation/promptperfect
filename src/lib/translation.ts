/**
 * Spanish ↔ English translation support for prompts (input and output).
 * Pure helpers: language guess, target labels, and the translator system
 * prompt. The actual call lives in `/api/translate` (server provider keys).
 */

export type TranslationTarget = 'es' | 'en';

const SPANISH_WORDS =
  /\b(el|la|los|las|una|unas|este|esta|para|porque|pero|como|cómo|donde|dónde|que|qué|hola|gracias|usted)\b/i;
const ENGLISH_WORDS =
  /\b(the|and|with|from|that|this|have|will|would|hello|thanks|please|your)\b/i;

/**
 * Best-effort guess of the dominant natural language. Counts distinctive
 * markers (accents, ¿¡) plus common stopwords. Ties and unknowns default to
 * English (the UI's primary language).
 */
export function detectLanguage(text: string): 'es' | 'en' {
  const t = text.trim();
  if (!t) return 'en';
  let es = 0;
  let en = 0;
  const accentHits = t.match(/[áéíóúñü¿¡]/gi)?.length ?? 0;
  es += Math.min(accentHits, 5);
  es += (t.match(SPANISH_WORDS) ?? []).length;
  en += (t.match(ENGLISH_WORDS) ?? []).length;
  return es > en ? 'es' : 'en';
}

/** The language `text` should be translated into (i.e. the other one). */
export function translationTargetFor(text: string): TranslationTarget {
  return detectLanguage(text) === 'es' ? 'en' : 'es';
}

export function targetLabel(target: TranslationTarget): string {
  return target === 'es' ? 'español' : 'English';
}

export function translateButtonLabel(text: string): string {
  return `Traducir al ${targetLabel(translationTargetFor(text))}`;
}

/** System prompt: translate prose only, preserve everything structural. */
export function buildTranslatorPrompt(target: TranslationTarget): string {
  const language = target === 'es' ? 'Spanish' : 'English';
  return (
    `You are a precise translator into ${language}. Translate ONLY the natural-language prose. ` +
    'Do NOT translate or alter: code, identifiers, URLs, numbers, {{PLACEHOLDERS}} (keep byte-identical), ' +
    'markdown syntax, or section-marker lines like ---EXPLANATION--- and ---CHANGES--- (keep them exactly as-is). ' +
    'Preserve tone, paragraph structure, and line breaks. ' +
    'Output ONLY the translation — no commentary, no quotes around it.'
  );
}
