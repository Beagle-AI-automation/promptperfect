import { google, createGoogleGenerativeAI } from '@ai-sdk/google';

import type { ProviderId } from './types';

export interface ProviderSelection {
  provider: ProviderId;
  model: string;
  apiKey?: string;
}

export function hasServerKey(provider: ProviderId): boolean {
  if (provider !== 'google') return false;
  return Boolean(process.env.GOOGLE_API_KEY);
}

function getProviderInstance(provider: ProviderId, apiKey?: string) {
  const key = apiKey?.trim();

  if (provider !== 'google') return google;

  // Single source of truth: GOOGLE_API_KEY
  // (Optional) apiKey can override via BYOK in request body.
  const effectiveKey = key || process.env.GOOGLE_API_KEY;
  if (!effectiveKey) return google;
  return createGoogleGenerativeAI({ apiKey: effectiveKey });
}

export function getDefaultModels(provider: ProviderId): string[] {
  if (provider !== 'google') return [];
  return [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
  ];
}

export function isRetryableProviderError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.toLowerCase().includes('rate limit') ||
    msg.toLowerCase().includes('quota') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('404') ||
    msg.toLowerCase().includes('not found')
  );
}

export function resolveModelList(selection: ProviderSelection): string[] {
  if (selection.model?.trim()) return [selection.model.trim()];
  return getDefaultModels(selection.provider);
}

export function getLanguageModel(selection: ProviderSelection, modelId: string) {
  const instance = getProviderInstance(selection.provider, selection.apiKey);
  // All provider instances are callable: provider(modelId)
  return instance(modelId);
}

