-- Quick fix: Add missing 'model' column. Run in Supabase SQL Editor.
alter table optimization_logs add column if not exists model text default 'unknown';
