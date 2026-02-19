'use client';

import { useCompletion } from '@ai-sdk/react';
import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { PromptInput } from '@/components/PromptInput';
import { ModeSelector } from '@/components/ModeSelector';
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { PromptOutput } from '@/components/PromptOutput';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { StatsBar } from '@/components/StatsBar';
import type { OptimizationMode, Provider } from '@/lib/types';

const STORAGE_KEY = 'promptperfect:apikey';

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadApiKey(provider: Provider): string {
  if (provider === 'gemini') return '';
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored[provider] || '';
  } catch {
    return '';
  }
}

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [selectedMode, setSelectedMode] = useState<OptimizationMode>('better');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [explanation, setExplanation] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsRefresh, setStatsRefresh] = useState(0);

  const saveScore = useCallback(async (sid: string, score: number) => {
    try {
      await fetch('/api/session-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, score }),
      });
    } catch {
      // ignore
    }
  }, []);

  const {
    completion,
    complete,
    isLoading,
    error,
  } = useCompletion({
    api: '/api/optimize',
    streamProtocol: 'text',
    body: { mode: selectedMode, provider, apiKey: provider !== 'gemini' ? apiKey : undefined },
    onFinish: () => {
      // Session ID already set before complete() call
    },
  });

  useEffect(() => {
    setApiKey(loadApiKey(provider));
  }, [provider]);

  const handleOptimize = useCallback(() => {
    if (!inputText.trim()) return;
    const sid = generateSessionId();
    setExplanation('');
    setSessionId(sid);
    complete(inputText.trim(), {
      body: {
        mode: selectedMode,
        provider,
        apiKey: provider !== 'gemini' ? apiKey : undefined,
        session_id: sid,
      },
    });
  }, [inputText, selectedMode, provider, apiKey, complete]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header onSettingsClick={() => setSettingsOpen(true)} />
      <div className="border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <StatsBar refreshTrigger={statsRefresh} />
      </div>

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Your prompt
            </h2>
            <PromptInput
              value={inputText}
              onChange={setInputText}
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Optimized prompt
            </h2>
            <PromptOutput
              text={completion}
              isStreaming={isLoading}
              onExplanation={setExplanation}
              onScore={
                sessionId
                  ? (score) => saveScore(sessionId, score)
                  : undefined
              }
            />
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-6xl">
          <div className="flex flex-col items-center gap-4">
            <ModeSelector
              value={selectedMode}
              onChange={setSelectedMode}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleOptimize}
              disabled={!inputText.trim() || isLoading}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Optimizing…' : 'Optimize'}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
              {error.message}
            </p>
          )}

          <div className="mt-6 space-y-4">
            <ExplanationPanel explanation={explanation} />
            <FeedbackButtons
              sessionId={sessionId}
              disabled={!completion || isLoading}
              onSubmitted={() => setStatsRefresh((n) => n + 1)}
            />
          </div>
        </div>
      </main>

      {settingsOpen && (
        <ApiKeyDialog
          key="settings"
          open={true}
          onClose={() => setSettingsOpen(false)}
          provider={provider}
          onProviderChange={setProvider}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
        />
      )}
    </div>
  );
}
