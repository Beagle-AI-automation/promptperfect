-- Ensure the auth trigger runs with a role that can disable RLS for the profile insert.
-- (On some projects the function owner was not postgres and SET LOCAL row_security = off had no effect.)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
