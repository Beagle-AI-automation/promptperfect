-- PP-504: profiles, history ownership, guest_usage (custom pp_users auth, not auth.users)

ALTER TABLE pp_optimization_history
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES pp_users (id) ON DELETE SET NULL;

ALTER TABLE pp_optimization_history
  ADD COLUMN IF NOT EXISTS provider text;

CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_user_id
  ON pp_optimization_history (user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS guest_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id text UNIQUE NOT NULL,
  optimization_count integer DEFAULT 0 NOT NULL,
  last_used_at timestamptz DEFAULT now(),
  last_mode text,
  last_provider text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_usage_guest_id_idx ON guest_usage (guest_id);

ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS guest_usage_service_only ON guest_usage
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS pp_user_profiles (
  id uuid PRIMARY KEY REFERENCES pp_users (id) ON DELETE CASCADE,
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

CREATE POLICY IF NOT EXISTS pp_user_profiles_select_all ON pp_user_profiles
  FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS pp_user_profiles_insert_all ON pp_user_profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS pp_user_profiles_update_all ON pp_user_profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.pp_handle_new_pp_user_profile()
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
    COALESCE(NULLIF(trim(NEW.name), ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'User'),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pp_on_pp_users_profile ON pp_users;

CREATE TRIGGER pp_on_pp_users_profile
  AFTER INSERT ON pp_users
  FOR EACH ROW
  EXECUTE PROCEDURE public.pp_handle_new_pp_user_profile();

INSERT INTO public.pp_user_profiles (id, email, display_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(NULLIF(trim(u.name), ''), split_part(COALESCE(u.email, ''), '@', 1), 'User'),
  NULL
FROM pp_users u
ON CONFLICT (id) DO NOTHING;
