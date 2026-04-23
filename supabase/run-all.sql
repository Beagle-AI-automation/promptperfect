-- Run this entire file in Supabase Dashboard → SQL Editor (in order).

-- 1. Fix optimization_logs mode constraint
ALTER TABLE optimization_logs DROP CONSTRAINT IF EXISTS optimization_logs_mode_check;
ALTER TABLE optimization_logs ADD CONSTRAINT optimization_logs_mode_check
  CHECK (mode IN ('better', 'specific', 'cot'));

-- 2. Create pp_users (skip if already exists)
CREATE TABLE IF NOT EXISTS pp_users (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text unique not null,
  password_hash text not null,
  provider text default 'gemini',
  model text default 'gemini-2.0-flash',
  api_key text default '',
  created_at timestamptz default now()
);

-- 3. Token tracking + guest sessions
ALTER TABLE pp_users ADD COLUMN IF NOT EXISTS demo_tokens_used integer default 0;
ALTER TABLE pp_users ADD COLUMN IF NOT EXISTS demo_token_limit integer default 100;

CREATE TABLE IF NOT EXISTS pp_guest_sessions (
  id uuid default gen_random_uuid() primary key,
  session_id text unique not null,
  tokens_used integer default 0,
  token_limit integer default 50,
  created_at timestamptz default now()
);

-- 4. Guest optimization limits (fingerprint in guest_id; service role only via API)
CREATE TABLE IF NOT EXISTS guest_usage (
  guest_id text PRIMARY KEY,
  optimization_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  last_mode text,
  last_provider text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_usage_last_used
  ON guest_usage (last_used_at DESC);

ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;

-- 5. User profiles + auth signup trigger (fixes "Database error creating new user")
--    Requires public.pp_optimization_history to exist (see 20250321000000_create_optimization_history.sql).
CREATE TABLE IF NOT EXISTS public.pp_user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pp_user_profiles_email ON public.pp_user_profiles (email);

ALTER TABLE public.pp_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pp_user_profiles_select_own" ON public.pp_user_profiles;
DROP POLICY IF EXISTS "pp_user_profiles_update_own" ON public.pp_user_profiles;
DROP POLICY IF EXISTS "pp_user_profiles_insert_own" ON public.pp_user_profiles;

CREATE POLICY "pp_user_profiles_select_own"
  ON public.pp_user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "pp_user_profiles_update_own"
  ON public.pp_user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "pp_user_profiles_insert_own"
  ON public.pp_user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pp_optimization_history'
  ) THEN
    ALTER TABLE public.pp_optimization_history
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;
    ALTER TABLE public.pp_optimization_history
      ADD COLUMN IF NOT EXISTS provider text;
    CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_user_id
      ON public.pp_optimization_history (user_id)
      WHERE user_id IS NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO public.pp_user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(TRIM(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)), '')
    ),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$fn$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
