export type OptimizationMode = 
  | 'better' 
  | 'specific' 
  | 'cot' 
  | 'developer' 
  | 'research' 
  | 'beginner' 
  | 'product' 
  | 'marketing';

export type Mode = OptimizationMode;

export type OptimizeVersion = 'v1' | 'v2';

export type Provider = 'gemini' | 'openai' | 'anthropic';
export type ProviderId = Provider;

export interface OptimizeRequest {
  prompt: string;
  mode: OptimizationMode;
  provider: Provider;
  /** BYOK key for openai/anthropic. Never persisted server-side. */
  apiKey?: string;
  /** Client-generated session ID for feedback. */
  session_id?: string;
  version?: OptimizeVersion;
}
