-- PromptPerfect: email/password signup fails with "Database error creating new user"
-- when a template trigger on auth.users runs a broken function (e.g. inserts into
-- public.profiles that does not exist or has wrong columns).
-- This app creates public.pp_users from /api/auth/signup instead — safe to remove
-- the stock "sync to profiles" trigger if you are not using that pattern.

-- Inspect current triggers (run in SQL Editor if you want to verify first):
-- SELECT tgname, pg_get_triggerdef(t.oid)
-- FROM pg_trigger t
-- JOIN pg_class c ON t.tgrelid = c.oid
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE n.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Some projects / older snippets use alternate names; ignore errors if absent.
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;

-- If you want to delete the old function too, run separately in SQL Editor
-- (only when no other trigger uses it), e.g.:
--   DROP FUNCTION IF EXISTS public.handle_new_user();
