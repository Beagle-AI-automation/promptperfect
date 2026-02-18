'use client';

import { ExplanationPanel } from '@/components/ExplanationPanel';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { OutputCard } from '@/components/OutputCard';

interface PromptPerfectOutputsProps {
  optimizedText: string;
  explanation: string;
  changes: string;
  sessionId: string;
  mode: string;
  isLoading: boolean;
}

export function PromptPerfectOutputs(props: PromptPerfectOutputsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <OutputCard
          title="Optimized prompt"
          text={props.optimizedText}
          isLoading={props.isLoading}
          emptyText="Your optimized prompt will show up here."
        />
        <OutputCard
          title="Explanation"
          text={props.explanation}
          isLoading={props.isLoading}
          emptyText="A detailed explanation of the optimized prompt will show up here."
        />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <ExplanationPanel explanation={props.changes} />
        </div>
        {props.optimizedText && !props.isLoading && (
          <div className="shrink-0">
            <FeedbackButtons
              sessionId={props.sessionId}
              mode={props.mode}
              disabled={props.isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}

