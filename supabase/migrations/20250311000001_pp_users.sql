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
