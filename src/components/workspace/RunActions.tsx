'use client';

import type { OptimizationMode, Provider } from '@/lib/types';
import { ShareButton } from '@/components/ShareButton';
import { SavePromptButton } from '@/components/SavePromptButton';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { ResultComplements } from '@/components/ResultComplements';
import { TranslateButton } from '@/components/TranslateButton';

export interface RunActionsProps {
  historyId: string | null;
  userId: string | null;
  sessionId: string | null;
  /** Raw composer input. */
  inputText: string;
  /** Optimized prompt with section markers stripped. */
  optimized: string;
  /** Full completion text (with markers) — translated as a unit. */
  fullText: string;
  explanation: string;
  mode: OptimizationMode;
  provider: Provider;
  inputLength: number;
  outputLength: number;
  inLibrary: boolean | null;
  feedbackDisabled: boolean;
  onSavedToLibrary: () => void;
  onFeedbackSubmitted: (direction: 'up' | 'down') => void;
  onTranslateOutput: (translatedFullText: string) => void;
  onRemediate?: (directiveBlock: string) => void;
}

/**
 * Post-run action row under the optimizer output: share, save to library,
 * thumbs feedback, and the result enrichments (quality, cost, download).
 * Pure render — all state lives in the page/hook layer.
 */
export function RunActions({
  historyId,
  userId,
  sessionId,
  inputText,
  optimized,
  fullText,
  explanation,
  mode,
  provider,
  inputLength,
  outputLength,
  inLibrary,
  feedbackDisabled,
  onSavedToLibrary,
  onFeedbackSubmitted,
  onTranslateOutput,
  onRemediate,
}: RunActionsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {historyId && <ShareButton historyId={historyId} userId={userId} />}
        <SavePromptButton
          originalPrompt={inputText}
          optimizedPrompt={optimized}
          explanation={explanation}
          mode={mode}
          provider={provider}
          userId={userId}
          historyId={historyId}
          alreadySaved={inLibrary === true}
          onSavedToLibrary={onSavedToLibrary}
        />
        <FeedbackButtons
          sessionId={sessionId}
          mode={mode}
          provider={provider}
          inputLength={inputLength}
          outputLength={outputLength}
          disabled={feedbackDisabled}
          onSubmitted={onFeedbackSubmitted}
        />
        <TranslateButton text={fullText} onTranslated={onTranslateOutput} />
      </div>
      <ResultComplements
        original={inputText}
        optimized={optimized}
        explanation={explanation}
        mode={mode}
        provider={provider}
        onRemediate={onRemediate}
      />
    </>
  );
}
