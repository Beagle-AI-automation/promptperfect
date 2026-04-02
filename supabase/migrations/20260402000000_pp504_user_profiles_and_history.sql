-- PP-504: user profiles, history ownership, guest migration support

-- Authenticated optimization rows (nullable for legacy / guest rows)
ALTER TABLE pp_optimization_history
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE pp_optimization_history
  ADD COLUMN IF NOT EXISTS provider text;

CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_user_id
  ON pp_optimization_history (user_id)
  WHERE user_id IS NOT NULL;

-- Profiles (one row per auth user; populated by trigger on signup)
CREATE TABLE IF NOT EXISTS pp_user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  optimization_count integer NOT NULL DEFAULT 0,
  favorite_mode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pp_user_profiles_email ON pp_user_profiles (email);

ALTER TABLE pp_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS pp_user_profiles_select_own
  ON pp_user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS pp_user_profiles_update_own
  ON pp_user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS pp_user_profiles_insert_own
  ON pp_user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.pp_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pp_user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'User'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pp_on_auth_user_created ON auth.users;

CREATE TRIGGER pp_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.pp_handle_new_user();

-- Existing auth users (created before this migration)
INSERT INTO public.pp_user_profiles (id, email, display_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(COALESCE(u.email, ''), '@', 1),
    'User'
  ),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
