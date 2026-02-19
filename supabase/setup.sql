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
