-- PromptPerfect: Run this entire file in Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Paste & Run

-- 001: Create optimization_logs table
create table if not exists optimization_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  mode text not null,
  provider text not null,
  model text not null,
  prompt_length integer not null default 0,
  rating integer,
  created_at timestamptz default now()
);
create index if not exists idx_optimization_logs_session_id on optimization_logs(session_id);
create index if not exists idx_optimization_logs_created_at on optimization_logs(created_at);

-- 002: Add prompt_score column
alter table optimization_logs add column if not exists prompt_score integer;

-- Fix: Add model column if missing (required for inserts)
alter table optimization_logs add column if not exists model text default 'unknown';

-- 003: Enable RLS and allow anon access
alter table optimization_logs enable row level security;
drop policy if exists "Allow anon insert" on optimization_logs;
drop policy if exists "Allow anon update" on optimization_logs;
drop policy if exists "Allow anon select" on optimization_logs;
create policy "Allow anon insert" on optimization_logs for insert to anon with check (true);
create policy "Allow anon update" on optimization_logs for update to anon using (true) with check (true);
create policy "Allow anon select" on optimization_logs for select to anon using (true);

-- 005: RLS policies for pp_optimization_history
--      Allows anonymous guests to insert their own rows (guest history),
--      and authenticated users to read/update rows linked to their account.
alter table if exists pp_optimization_history enable row level security;

drop policy if exists "Anon can insert history" on pp_optimization_history;
drop policy if exists "Anon can select own session history" on pp_optimization_history;
drop policy if exists "Auth users can select own history" on pp_optimization_history;
drop policy if exists "Auth users can update own history" on pp_optimization_history;

create policy "Anon can insert history"
  on pp_optimization_history for insert to anon
  with check (true);

create policy "Anon can select own session history"
  on pp_optimization_history for select to anon
  using (user_id is null);

create policy "Auth users can select own history"
  on pp_optimization_history for select to authenticated
  using (auth.uid() = user_id);

create policy "Auth users can update own history"
  on pp_optimization_history for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 004: Guest usage tracking (5 free optimizations per anonymous visitor)
create table if not exists guest_usage (
  guest_id text primary key,
  optimization_count integer not null default 0,
  last_used_at timestamptz default now(),
  last_mode text,
  last_provider text,
  created_at timestamptz default now()
);
create index if not exists idx_guest_usage_guest_id on guest_usage(guest_id);
alter table guest_usage enable row level security;
drop policy if exists "Allow anon insert guest_usage" on guest_usage;
drop policy if exists "Allow anon update guest_usage" on guest_usage;
drop policy if exists "Allow anon select guest_usage" on guest_usage;
create policy "Allow anon insert guest_usage" on guest_usage for insert to anon with check (true);
create policy "Allow anon update guest_usage" on guest_usage for update to anon using (true) with check (true);
create policy "Allow anon select guest_usage" on guest_usage for select to anon using (true);
