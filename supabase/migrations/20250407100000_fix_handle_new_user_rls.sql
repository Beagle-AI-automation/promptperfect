-- Creating Auth users failed with "Database error creating new user" because
-- handle_new_user() inserts into pp_user_profiles while RLS is on; the insert
-- policy checks auth.uid() = id, but auth.uid() is NULL inside a trigger, so
-- the insert was rejected and the whole signup rolled back.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
