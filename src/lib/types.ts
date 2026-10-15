export type OptimizationMode = 
  | 'better' 
  | 'specific' 
  | 'cot' 
  | 'developer' 
  | 'research' 
  | 'beginner' 
  | 'product' 
  | 'marketing'
  | 'production';

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

/**
 * Signed-in workspace user (client-side view). `provider`/`model` are engine
 * prefs; identity (`id`/`email`) comes from the Supabase session.
 */
export interface AppUser {
  id: string;
  name: string | null;
  email: string;
  provider: string;
  model: string;
}
