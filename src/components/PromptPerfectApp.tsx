'use client';

import { useMemo, useState } from 'react';

import { PromptPerfectActions } from '@/components/PromptPerfectActions';
import { PromptChatBox } from '@/components/PromptChatBox';
import { PromptPerfectForm } from '@/components/PromptPerfectForm';
import { PromptPerfectHeader } from '@/components/PromptPerfectHeader';
import { PromptPerfectOutputs } from '@/components/PromptPerfectOutputs';
import { PromptScoreRow } from '@/components/PromptScoreRow';
import { useApiConfig } from '@/hooks/useApiConfig';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useOptimizePrompt } from '@/hooks/useOptimizePrompt';
import type { Mode, OptimizeVersion } from '@/lib/types';

const PROVIDER = 'google' as const;

export function PromptPerfectApp() {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('developer');
  const [version, setVersion] = useState<OptimizeVersion>('v2');
  const [modelOverride, setModelOverride] = useState('');

  const { hasServerKey } = useApiConfig();
  const keyState = useLocalStorageState('promptperfect:apiKey:google', '');

  const {
    optimizedText,
    explanation,
    changes,
    sessionId,
    provider: usedProvider,
    model: usedModel,
    isLoading,
    error,
    optimize,
    reset,
  } = useOptimizePrompt();

  const helpText = useMemo(() => {
    const serverHasKey = hasServerKey(PROVIDER);
    if (serverHasKey) {
      return 'Server key detected. You can leave this empty, or paste a BYOK key to override.';
    }
    return 'No server key detected for this provider. Paste your key (stored in your browser).';
  }, [hasServerKey]);

  const shouldShowKeyHint =
    !hasServerKey(PROVIDER) && keyState.hydrated && keyState.value.trim().length === 0;

  return (
    <div className="min-h-screen w-full px-5 py-10 md:px-10 md:py-12">
      <div className="w-full">
        <div className="mb-10">
          <PromptPerfectHeader />
        </div>

        {/* Top (two columns): Left prompt box, Right controls/actions/score */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <PromptChatBox value={prompt} onChange={setPrompt} disabled={isLoading} />

          <div className="space-y-6">
            <div className="rounded-[28px] border border-zinc-200 bg-white/50 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/30 md:p-7">
              <PromptPerfectForm
                mode={mode}
                onModeChange={setMode}
                version={version}
                onVersionChange={(v) => {
                  setVersion(v);
                  reset();
                }}
                apiKey={keyState.value}
                onApiKeyChange={keyState.setValue}
                apiKeyHelpText={helpText}
                apiKeyDisabled={isLoading || !keyState.hydrated}
                modelOverride={modelOverride}
                onModelOverrideChange={setModelOverride}
                disabled={isLoading}
              />

              <div className="mt-6">
                <PromptPerfectActions
                  canSubmit={Boolean(prompt.trim())}
                  isLoading={isLoading}
                  usedProvider={usedProvider}
                  usedModel={usedModel}
                  onSubmit={() =>
                    optimize({
                      prompt,
                      mode,
                      provider: PROVIDER,
                      version,
                      apiKey: keyState.value,
                      model: modelOverride,
                    })
                  }
                  onReset={() => {
                    setPrompt('');
                    reset();
                  }}
                />
              </div>
            </div>

            <PromptScoreRow originalText={prompt} optimizedText={optimizedText} />

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            {shouldShowKeyHint ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800 shadow-sm backdrop-blur dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                Add <code className="font-mono">GOOGLE_API_KEY</code> to <code className="font-mono">.env</code> and
                restart <code className="font-mono">npm run dev</code>, or open Advanced and paste a BYOK key.
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom (two columns): Optimized + Explanation */}
        <div className="mt-8">
          <PromptPerfectOutputs
            optimizedText={optimizedText}
            explanation={explanation}
            changes={changes}
            sessionId={sessionId}
            mode={mode}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

