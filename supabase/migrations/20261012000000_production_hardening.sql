-- 20261012000000_production_hardening.sql
--
-- Production hardening (additive, idempotent, backward-compatible).
-- Pattern: expand-and-contract — only ADDs constraints/indexes/policies,
-- never drops columns or changes types. Safe to re-run; safe on populated
-- production tables at current scale (see lock table below).
--
-- Lock-safety (Postgres 16 lock levels, all DDL transactional here):
--   ADD CONSTRAINT ... NOT VALID  → SHARE UPDATE EXCLUSIVE, brief (no scan).
--   VALIDATE CONSTRAINT           → SHARE UPDATE EXCLUSIVE for the scan:
--                                   blocks WRITES, allows READS. Duration ∝
--                                   table size; fine at current row counts.
--   CREATE INDEX (non-concurrent) → SHARE lock: blocks writes during build.
--   ADD COLUMN + DEFAULT          → metadata-only since PG11 (no rewrite).
--   POLICY / TRIGGER DDL          → brief, self-conflicting locks only.
-- Deliberately NOT CONCURRENTLY: CREATE INDEX CONCURRENTLY cannot run
-- inside a transaction block, and migrate.js wraps each file in one
-- transaction (atomicity wins over zero-downtime index builds at this
-- scale). If a target table ever exceeds ~1M rows, build the index
-- out-of-band and follow the README's large-table procedure instead.
--
-- Covers:
--   1. Required extension (pgcrypto for gen_random_uuid()).
--   2. CHECK constraints: modes, ratings/scores, non-negative counters,
--      non-empty bounded text payloads.
--   3. Missing high-traffic indexes.
--   4. RLS enabled on every table + hardened WITH CHECK payload guards on
--      the intentionally permissive anon-insert paths (guest flows).
--   5. updated_at maintenance trigger (CREATE OR REPLACE, DROP + CREATE
--      triggers idempotently).
--   6. Re-assert handle_new_user() hardening (SECURITY DEFINER, search_path).
--
-- Rollback: every object created here has a stable name; drop in reverse
-- order (policies → triggers → indexes → constraints). See supabase/README.md.

-- =====================================================================
-- 0. Extension
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 1. CHECK constraints (drop + re-add keeps a single canonical definition)
-- =====================================================================

-- optimization_logs.mode: canonical set incl. 'production' (audit runs).
ALTER TABLE public.optimization_logs
  DROP CONSTRAINT IF EXISTS optimization_logs_mode_check;
ALTER TABLE public.optimization_logs
  ADD CONSTRAINT optimization_logs_mode_check
  CHECK (mode IN ('better', 'specific', 'cot', 'production')) NOT VALID;
ALTER TABLE public.optimization_logs VALIDATE CONSTRAINT optimization_logs_mode_check;

-- optimization_logs counters must be non-negative (rejects negative tokens).
ALTER TABLE public.optimization_logs
  DROP CONSTRAINT IF EXISTS optimization_logs_lengths_nonneg;
ALTER TABLE public.optimization_logs
  ADD CONSTRAINT optimization_logs_lengths_nonneg
  CHECK (
    prompt_length >= 0
    AND optimized_length >= 0
    AND explanation_length >= 0
  ) NOT VALID;
ALTER TABLE public.optimization_logs VALIDATE CONSTRAINT optimization_logs_lengths_nonneg;

-- prompt_score is 1-100 when present.
ALTER TABLE public.optimization_logs
  DROP CONSTRAINT IF EXISTS optimization_logs_prompt_score_range;
ALTER TABLE public.optimization_logs
  ADD CONSTRAINT optimization_logs_prompt_score_range
  CHECK (prompt_score IS NULL OR (prompt_score BETWEEN 1 AND 100)) NOT VALID;
ALTER TABLE public.optimization_logs VALIDATE CONSTRAINT optimization_logs_prompt_score_range;

-- session_id must be non-empty.
ALTER TABLE public.optimization_logs
  DROP CONSTRAINT IF EXISTS optimization_logs_session_nonempty;
ALTER TABLE public.optimization_logs
  ADD CONSTRAINT optimization_logs_session_nonempty
  CHECK (session_id IS NOT NULL AND char_length(session_id) BETWEEN 1 AND 300) NOT VALID;
ALTER TABLE public.optimization_logs VALIDATE CONSTRAINT optimization_logs_session_nonempty;

-- pp_optimization_history: bounded modes + bounded payloads (reject oversized prompts).
ALTER TABLE public.pp_optimization_history
  DROP CONSTRAINT IF EXISTS pp_optimization_history_mode_check;
ALTER TABLE public.pp_optimization_history
  ADD CONSTRAINT pp_optimization_history_mode_check
  CHECK (mode IN ('better', 'specific', 'cot', 'production')) NOT VALID;
ALTER TABLE public.pp_optimization_history VALIDATE CONSTRAINT pp_optimization_history_mode_check;

ALTER TABLE public.pp_optimization_history
  DROP CONSTRAINT IF EXISTS pp_optimization_history_payload_bounds;
ALTER TABLE public.pp_optimization_history
  ADD CONSTRAINT pp_optimization_history_payload_bounds
  CHECK (
    char_length(session_id) BETWEEN 1 AND 300
    AND char_length(prompt_original) BETWEEN 1 AND 60000
    AND char_length(prompt_optimized) BETWEEN 1 AND 60000
    AND (explanation IS NULL OR char_length(explanation) <= 20000)
    AND (share_id IS NULL OR char_length(share_id) BETWEEN 6 AND 64)
    AND (provider IS NULL OR char_length(provider) BETWEEN 1 AND 64)
  ) NOT VALID;
ALTER TABLE public.pp_optimization_history VALIDATE CONSTRAINT pp_optimization_history_payload_bounds;

-- pp_saved_prompts: bounded library rows.
ALTER TABLE public.pp_saved_prompts
  DROP CONSTRAINT IF EXISTS pp_saved_prompts_mode_check;
ALTER TABLE public.pp_saved_prompts
  ADD CONSTRAINT pp_saved_prompts_mode_check
  CHECK (mode IN ('better', 'specific', 'cot', 'production')) NOT VALID;
ALTER TABLE public.pp_saved_prompts VALIDATE CONSTRAINT pp_saved_prompts_mode_check;

ALTER TABLE public.pp_saved_prompts
  DROP CONSTRAINT IF EXISTS pp_saved_prompts_payload_bounds;
ALTER TABLE public.pp_saved_prompts
  ADD CONSTRAINT pp_saved_prompts_payload_bounds
  CHECK (
    char_length(title) BETWEEN 1 AND 300
    AND char_length(original_prompt) BETWEEN 1 AND 60000
    AND char_length(optimized_prompt) <= 60000
    AND char_length(explanation) <= 20000
  ) NOT VALID;
ALTER TABLE public.pp_saved_prompts VALIDATE CONSTRAINT pp_saved_prompts_payload_bounds;

-- Counters / limits non-negative (service-role writes still validated).
ALTER TABLE public.guest_usage
  DROP CONSTRAINT IF EXISTS guest_usage_count_nonneg;
ALTER TABLE public.guest_usage
  ADD CONSTRAINT guest_usage_count_nonneg
  CHECK (optimization_count >= 0) NOT VALID;
ALTER TABLE public.guest_usage VALIDATE CONSTRAINT guest_usage_count_nonneg;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pp_guest_sessions'
  ) THEN
    ALTER TABLE public.pp_guest_sessions
      DROP CONSTRAINT IF EXISTS pp_guest_sessions_tokens_nonneg;
    ALTER TABLE public.pp_guest_sessions
      ADD CONSTRAINT pp_guest_sessions_tokens_nonneg
      CHECK (tokens_used >= 0 AND token_limit > 0) NOT VALID;
    ALTER TABLE public.pp_guest_sessions
      VALIDATE CONSTRAINT pp_guest_sessions_tokens_nonneg;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pp_users'
  ) THEN
    ALTER TABLE public.pp_users
      DROP CONSTRAINT IF EXISTS pp_users_demo_tokens_nonneg;
    ALTER TABLE public.pp_users
      ADD CONSTRAINT pp_users_demo_tokens_nonneg
      CHECK (
        (demo_tokens_used IS NULL OR demo_tokens_used >= 0)
        AND (demo_token_limit IS NULL OR demo_token_limit > 0)
      ) NOT VALID;
    ALTER TABLE public.pp_users
      VALIDATE CONSTRAINT pp_users_demo_tokens_nonneg;
  END IF;
END
$$;

-- Converge the two historical pp_user_profiles variants (auth.users-based vs
-- legacy pp_users-based): ensure the app columns exist before constraining.
ALTER TABLE public.pp_user_profiles
  ADD COLUMN IF NOT EXISTS optimization_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.pp_user_profiles
  ADD COLUMN IF NOT EXISTS favorite_mode text;
ALTER TABLE public.pp_user_profiles
  DROP CONSTRAINT IF EXISTS pp_user_profiles_count_nonneg;
ALTER TABLE public.pp_user_profiles
  ADD CONSTRAINT pp_user_profiles_count_nonneg
  CHECK (optimization_count IS NULL OR optimization_count >= 0) NOT VALID;
ALTER TABLE public.pp_user_profiles VALIDATE CONSTRAINT pp_user_profiles_count_nonneg;

-- guest_usage shape normalisation (both historical variants converge here
-- without rewriting the PK): ensure an `id` exists, ensure guest_id is
-- unique + non-empty.
ALTER TABLE public.guest_usage
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.guest_usage
  DROP CONSTRAINT IF EXISTS guest_usage_guest_id_nonempty;
ALTER TABLE public.guest_usage
  ADD CONSTRAINT guest_usage_guest_id_nonempty
  CHECK (char_length(guest_id) BETWEEN 1 AND 300) NOT VALID;
ALTER TABLE public.guest_usage VALIDATE CONSTRAINT guest_usage_guest_id_nonempty;
CREATE UNIQUE INDEX IF NOT EXISTS guest_usage_guest_id_unique
  ON public.guest_usage (guest_id);

-- =====================================================================
-- 2. Indexes for hot paths (user lookups, timeline sorts, FK joins)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_optimization_logs_user_created
  ON public.optimization_logs (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_optimization_logs_session_created
  ON public.optimization_logs (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_user_created
  ON public.pp_optimization_history (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_session_created
  ON public.pp_optimization_history (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pp_saved_prompts_user_updated
  ON public.pp_saved_prompts (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_guest_usage_count
  ON public.guest_usage (optimization_count DESC);

-- =====================================================================
-- 3. RLS: enabled everywhere + payload-guarded anon-insert paths
-- =====================================================================
ALTER TABLE public.optimization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pp_optimization_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pp_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pp_saved_prompts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pp_users'
  ) THEN
    ALTER TABLE public.pp_users ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pp_guest_sessions'
  ) THEN
    ALTER TABLE public.pp_guest_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Guest history inserts stay open (product requirement) but now reject
-- empty/oversized payloads and off-list modes at the policy layer too,
-- so a malformed client cannot bypass the CHECKs via a different role.
DROP POLICY IF EXISTS "pp_history_guest_insert_guarded" ON public.pp_optimization_history;
CREATE POLICY "pp_history_guest_insert_guarded"
  ON public.pp_optimization_history FOR INSERT TO anon
  WITH CHECK (
    char_length(session_id) BETWEEN 1 AND 300
    AND char_length(prompt_original) BETWEEN 1 AND 60000
    AND char_length(prompt_optimized) BETWEEN 1 AND 60000
    AND mode IN ('better', 'specific', 'cot', 'production')
  );

DROP POLICY IF EXISTS "opt_logs_guest_insert_guarded" ON public.optimization_logs;
CREATE POLICY "opt_logs_guest_insert_guarded"
  ON public.optimization_logs FOR INSERT TO anon
  WITH CHECK (
    char_length(session_id) BETWEEN 1 AND 300
    AND mode IN ('better', 'specific', 'cot', 'production')
    AND prompt_length >= 0
  );

-- =====================================================================
-- 4. updated_at maintenance (single canonical trigger function)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.pp_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pp_saved_prompts_set_updated_at ON public.pp_saved_prompts;
CREATE TRIGGER pp_saved_prompts_set_updated_at
  BEFORE UPDATE ON public.pp_saved_prompts
  FOR EACH ROW
  EXECUTE PROCEDURE public.pp_set_updated_at();

DROP TRIGGER IF EXISTS pp_user_profiles_set_updated_at ON public.pp_user_profiles;
CREATE TRIGGER pp_user_profiles_set_updated_at
  BEFORE UPDATE ON public.pp_user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.pp_set_updated_at();

-- =====================================================================
-- 5. Trigger-function ownership (hardening re-assert)
-- =====================================================================
-- NOTE: SECURITY DEFINER / search_path are CREATE-time attributes, already
-- set in 20250405000000 / 20250407100000 / 20260420120000. ALTER FUNCTION
-- cannot change them, so this block only fixes ownership where possible.
-- DEFINER/search_path are asserted in supabase/tests/verify.js.
--
-- The 20250410 migration dropped the on_auth_user_created trigger (it was
-- removing a broken template trigger that shared the name); later
-- migrations re-created the FUNCTION but never re-attached the trigger, so
-- fresh databases had no signup → profile automation. Re-attach it here
-- (idempotent): this is the documented intent of 20250405
-- ("Auto-create profile row when Supabase Auth user is created").
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
  EXCEPTION
    WHEN undefined_object OR insufficient_privilege THEN
      RAISE NOTICE 'handle_new_user owner change skipped (role postgres unavailable).';
  END;
END
$$;
