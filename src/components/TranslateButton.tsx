'use client';

import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { translateButtonLabel, translationTargetFor } from '@/lib/translation';

interface TranslateButtonProps {
  /** Text to translate. Button hides its label target from this. */
  text: string;
  /** Called with the translated text on success. */
  onTranslated: (translated: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * One-click ES⇄EN translation without leaving the page. Direction is
 * auto-detected from the text (Spanish markers → English, else Spanish).
 */
export function TranslateButton({
  text,
  onTranslated,
  disabled = false,
  className = '',
}: TranslateButtonProps) {
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTranslate = text.trim().length > 0 && !disabled && !translating;

  const handleClick = async () => {
    if (!canTranslate) return;
    setTranslating(true);
    setError(null);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLang: translationTargetFor(text),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        translatedText?: string;
        error?: string;
      };
      if (!res.ok || !data.translatedText?.trim()) {
        setError(
          typeof data.error === 'string' && data.error
            ? data.error
            : 'Could not translate',
        );
        return;
      }
      onTranslated(data.translatedText.trim());
    } catch {
      setError('Could not translate');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={!canTranslate}
        title={translateButtonLabel(text)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-transparent px-2.5 py-1.5 text-xs font-medium text-[#B0B0B0] transition hover:border-accent/50 hover:text-[#ECECEC] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {translating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Languages className="h-3.5 w-3.5" aria-hidden />
        )}
        {translating ? 'Traduciendo…' : translateButtonLabel(text)}
      </button>
      {error ? (
        <span className="text-[11px] text-red-400" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
