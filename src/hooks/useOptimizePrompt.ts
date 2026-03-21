'use client';

import { useCallback, useRef, useState } from 'react';

import { splitOptimizedOutput } from '@/lib/delimiter';
import {
  postOptimizeStream,
  postOptimizeSync,
  readUint8Stream,
} from '@/lib/client/optimizeApi';
import { saveToHistory } from '@/lib/client/optimizationHistory';
import type { Mode, OptimizeVersion, ProviderId } from '@/lib/types';
import type { OptimizationLogInsert } from '@/lib/client/optimizationLogs';

async function safeLogOptimization(insert: OptimizationLogInsert) {
  try {
    const mod = await import('@/lib/client/optimizationLogs');
    await mod.logOptimization(insert);
  } catch {
    // ignore logging failures
  }
}

async function safeSaveToHistory(params: {
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation: string;
}): Promise<string | null> {
  try {
    return await saveToHistory(params);
  } catch {
    return null;
  }
}

interface OptimizeState {
  optimizedText: string;
  explanation: string;
  changes: string;
  rawText: string;
  sessionId: string;
  historyId: string | null;
  provider: ProviderId;
  model: string;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_PROVIDER: ProviderId = 'gemini';

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function initialState(): OptimizeState {
  return {
    optimizedText: '',
    explanation: '',
    changes: '',
    rawText: '',
    sessionId: '',
    historyId: null,
    provider: DEFAULT_PROVIDER,
    model: '',
    isLoading: false,
    error: null,
  };
}

export function useOptimizePrompt() {
  const [state, setState] = useState<OptimizeState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(initialState());
  }, []);

  const optimize = useCallback(
    async (args: {
      prompt: string;
      mode: Mode;
      provider: ProviderId;
      version: OptimizeVersion;
      apiKey?: string;
      model?: string;
    }) => {
      const prompt = args.prompt.trim();
      if (!prompt) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const sessionId = generateSessionId();
      setState((s) => ({
        ...s,
        optimizedText: '',
        explanation: '',
        changes: '',
        rawText: '',
        sessionId,
        historyId: null,
        provider: args.provider,
        model: '',
        isLoading: true,
        error: null,
      }));

      try {
        if (args.version === 'v1') {
          const data = await postOptimizeSync({
            prompt,
            mode: args.mode,
            session_id: sessionId,
            version: 'v1',
            provider: args.provider,
            apiKey: args.apiKey,
            model: args.model,
            signal: controller.signal,
          });

          setState((s) => ({
            ...s,
            optimizedText: data.optimizedText,
            explanation: data.explanation,
            changes: data.changes,
            rawText: data.rawText,
            provider: data.provider ?? s.provider,
            model: data.model ?? '',
            isLoading: false,
          }));

          void safeLogOptimization({
            session_id: sessionId,
            mode: args.mode,
            version: 'v1',
            provider: data.provider ?? 'gemini',
            model: data.model ?? '',
            prompt_length: prompt.length,
            optimized_length: data.optimizedText.length,
            explanation_length: data.explanation.length + data.changes.length,
          });

          // Save to history and get the ID
          const historyId = await safeSaveToHistory({
            prompt_original: prompt,
            prompt_optimized: data.optimizedText,
            mode: args.mode,
            explanation: data.explanation,
          });

          setState((s) => ({ ...s, historyId }));

          return;
        }

        const { provider, model, reader } = await postOptimizeStream({
          prompt,
          mode: args.mode,
          session_id: sessionId,
          version: 'v2',
          provider: args.provider,
          apiKey: args.apiKey,
          model: args.model,
          signal: controller.signal,
        });

        let buffer = '';

        await readUint8Stream(reader, (chunkText) => {
          buffer += chunkText;
          const { optimizedText, explanation, changes } = splitOptimizedOutput(buffer);
          setState((s) => ({
            ...s,
            rawText: buffer,
            optimizedText,
            explanation,
            changes,
            provider,
            model,
          }));
        });

        const { optimizedText, explanation, changes } = splitOptimizedOutput(buffer);
        void safeLogOptimization({
          session_id: sessionId,
          mode: args.mode,
          version: 'v2',
          provider,
          model,
          prompt_length: prompt.length,
          optimized_length: optimizedText.length,
          explanation_length: explanation.length + changes.length,
        });

        // Save to history and get the ID
        const historyId = await safeSaveToHistory({
          prompt_original: prompt,
          prompt_optimized: optimizedText,
          mode: args.mode,
          explanation,
        });

        setState((s) => ({ ...s, isLoading: false, historyId }));
      } catch (err) {
        if (controller.signal.aborted) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Something went wrong',
        }));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [],
  );

  return { ...state, optimize, reset };
}

