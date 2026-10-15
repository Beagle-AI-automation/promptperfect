-- DEPRECATED: superseded by migrations (prompt_score/model columns).
-- Kept for reference only; prefer `npm run db:migrate`.
-- Quick fix: Add missing 'model' column. Run in Supabase SQL Editor.
alter table optimization_logs add column if not exists model text default 'unknown';
