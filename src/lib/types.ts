export type Mode = 'developer' | 'research' | 'beginner' | 'product' | 'marketing';

export type ProviderId = 'google';

export type OptimizeVersion = 'v1' | 'v2';

export interface OptimizeRequest {
  prompt: string;
  mode: Mode;
  provider?: ProviderId;
  /**
   * Optional BYOK key. Never persisted server-side.
   * If not set, server env var for the provider must exist.
   */
  apiKey?: string;
  /**
   * Optional model override (advanced). If not provided, we use defaults/fallbacks.
   */
  model?: string;
}

export interface OptimizeResponseV1 {
  optimizedText: string;
  explanation: string;
  rawText: string;
  provider: ProviderId;
  model: string;
}

