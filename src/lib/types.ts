export type OptimizationMode = 'better' | 'specific' | 'cot';

export type Provider = 'gemini' | 'openai' | 'anthropic';

export interface OptimizeRequest {
  prompt: string;
  mode: OptimizationMode;
  provider: Provider;
  /** BYOK key for openai/anthropic. Never persisted server-side. */
  apiKey?: string;
  /** Client-generated session ID for feedback. */
  session_id?: string;
}
