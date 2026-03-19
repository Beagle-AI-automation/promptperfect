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
