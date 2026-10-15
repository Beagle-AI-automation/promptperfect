-- Ensure the auth trigger runs with a role that can disable RLS for the profile insert.
-- (On some projects the function owner was not postgres and SET LOCAL row_security = off had no effect.)
-- Defensive: no-op on environments without a `postgres` role (same pattern as
-- 20261012000000_production_hardening.sql). Already-applied databases are unaffected.
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
