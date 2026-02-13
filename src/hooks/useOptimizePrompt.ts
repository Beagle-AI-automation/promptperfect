'use client';

import { useCallback, useRef, useState } from 'react';

import { splitOptimizedOutput } from '@/lib/delimiter';
import {
  postOptimizeStream,
  postOptimizeSync,
  readUint8Stream,
} from '@/lib/client/optimizeApi';
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

interface OptimizeState {
  optimizedText: string;
  explanation: string;
  rawText: string;
  provider: ProviderId;
  model: string;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_PROVIDER: ProviderId = 'google';

function initialState(): OptimizeState {
  return {
    optimizedText: '',
    explanation: '',
    rawText: '',
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

      setState((s) => ({
        ...s,
        optimizedText: '',
        explanation: '',
        rawText: '',
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
            provider: args.provider,
            apiKey: args.apiKey,
            model: args.model,
            signal: controller.signal,
          });

          setState((s) => ({
            ...s,
            optimizedText: data.optimizedText,
            explanation: data.explanation,
            rawText: data.rawText,
            provider: data.provider ?? s.provider,
            model: data.model ?? '',
            isLoading: false,
          }));

          void safeLogOptimization({
            mode: args.mode,
            version: 'v1',
            provider: 'google',
            model: data.model ?? '',
            prompt_length: prompt.length,
            optimized_length: data.optimizedText.length,
            explanation_length: data.explanation.length,
          });

          return;
        }

        const { provider, model, reader } = await postOptimizeStream({
          prompt,
          mode: args.mode,
          provider: args.provider,
          apiKey: args.apiKey,
          model: args.model,
          signal: controller.signal,
        });

        let buffer = '';

        await readUint8Stream(reader, (chunkText) => {
          buffer += chunkText;
          const { optimizedText, explanation } = splitOptimizedOutput(buffer);
          setState((s) => ({
            ...s,
            rawText: buffer,
            optimizedText,
            explanation,
            provider,
            model,
          }));
        });

        const { optimizedText, explanation } = splitOptimizedOutput(buffer);
        void safeLogOptimization({
          mode: args.mode,
          version: 'v2',
          provider: 'google',
          model,
          prompt_length: prompt.length,
          optimized_length: optimizedText.length,
          explanation_length: explanation.length,
        });

        setState((s) => ({ ...s, isLoading: false }));
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

