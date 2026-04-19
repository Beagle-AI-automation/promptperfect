-- User-facing profile (auto-created via trigger on auth.users insert)
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

CREATE POLICY "pp_user_profiles_select_own"
  ON public.pp_user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "pp_user_profiles_update_own"
  ON public.pp_user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "pp_user_profiles_insert_own"
  ON public.pp_user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Optimization history: tie rows to account for stats & dashboards
ALTER TABLE public.pp_optimization_history
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.pp_optimization_history
  ADD COLUMN IF NOT EXISTS provider text;

CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_user_id
  ON public.pp_optimization_history (user_id)
  WHERE user_id IS NOT NULL;

-- Auto-create profile row when Supabase Auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- RLS policies use auth.uid(); it is NULL in triggers, so bypass RLS for this insert.
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
