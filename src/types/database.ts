/**
 * Canonical Postgres row/insert shapes.
 *
 * The Supabase CLI (`supabase gen types`) is not available in this environment,
 * so these are hand-maintained from `supabase/migrations/*.sql`. Later ALTER
 * migrations only ADD nullable columns — every field added after table
 * creation is optional here, so inserts stay valid across migration states.
 * If the CLI becomes available, regenerate and replace this file.
 */

export interface OptimizationLogInsert {
  session_id: string;
  mode: string;
  version: string;
  provider: string;
  model: string;
  prompt_length: number;
  optimized_length: number;
  explanation_length: number;
  rating?: string | null;
  feedback?: string | null;
  /** Added by 20260419110000_optimization_logs_user_id. */
  user_id?: string | null;
  /** Added by 20260419100000_optimize_session_and_saved_history. */
  optimize_session_id?: string | null;
  /** Added by 20260507000000_optimization_logs_prompt_score (was setup.sql-only). */
  prompt_score?: number | null;
}

export interface OptimizationHistoryInsert {
  session_id: string;
  prompt_original: string;
  prompt_optimized: string;
  mode: string;
  explanation?: string | null;
  share_id?: string | null;
  user_id?: string | null;
  provider?: string | null;
  optimize_session_id?: string | null;
}

export interface SavedPromptInsert {
  user_id: string;
  title: string;
  original_prompt: string;
  optimized_prompt?: string | null;
  explanation?: string | null;
  mode?: string | null;
  provider?: string | null;
  source_history_id?: string | null;
}

export interface GuestUsageInsert {
  guest_id: string;
  optimization_count?: number | null;
  last_used_at?: string | null;
  last_mode?: string | null;
  last_provider?: string | null;
}

export interface PpUserInsert {
  id?: string;
  email: string;
  name?: string | null;
  /** Required by schema (no default); app writes 'supabase_auth' for Auth users. */
  password_hash: string;
  provider?: string | null;
  model?: string | null;
  api_key?: string | null;
  /** Legacy demo quota columns (20250311000002); defaulted, unused by app code. */
  demo_tokens_used?: number | null;
  demo_token_limit?: number | null;
}

export interface PpUserProfileInsert {
  /** PK is `id` (= auth user id); there is no `user_id` column. */
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
}

/** Legacy demo table (20250311000002); not referenced by current app code. */
export interface PpGuestSessionInsert {
  session_id: string;
  tokens_used?: number | null;
  token_limit?: number | null;
}
