'use client';

import { OutputCard } from '@/components/OutputCard';

interface PromptPerfectOutputsProps {
  optimizedText: string;
  explanation: string;
  isLoading: boolean;
}

export function PromptPerfectOutputs(props: PromptPerfectOutputsProps) {
  return (
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
        emptyText="Explanations will show up here after the delimiter."
      />
    </div>
  );
}

