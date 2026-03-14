-- Token tracking for demo limits
ALTER TABLE pp_users ADD COLUMN IF NOT EXISTS demo_tokens_used integer default 0;
ALTER TABLE pp_users ADD COLUMN IF NOT EXISTS demo_token_limit integer default 100;

-- Guest sessions for non-logged-in visitors
CREATE TABLE IF NOT EXISTS pp_guest_sessions (
  id uuid default gen_random_uuid() primary key,
  session_id text unique not null,
  tokens_used integer default 0,
  token_limit integer default 50,
  created_at timestamptz default now()
);
