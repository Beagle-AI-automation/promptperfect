-- supabase/tests/auth_stub.sql
--
-- Minimal `auth` schema stub so the versioned migrations can run on plain
-- ephemeral Postgres in CI (GitHub Actions `postgres:16` service).
-- On real Supabase this file is NEVER applied: the platform already owns
-- `auth.users`, `auth.uid()` and `auth.role()`. The stub is idempotent and
-- namespaced so a mistaken run against Supabase is a harmless no-op
-- (objects already exist → CREATE ... IF NOT EXISTS / OR REPLACE wins).
--
-- Provides:
--   auth.users (id, email, raw_user_meta_data)
--   auth.uid()   → NULL (no session in migration context)
--   auth.role()  → 'service_role' (migrations run privileged)

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULL::uuid $$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT 'service_role'::text $$;

-- Supabase built-in roles (present on the platform; required here because
-- policies are granted TO anon / authenticated / service_role and plain
-- Postgres validates the grantee at CREATE POLICY time).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;
