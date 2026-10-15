-- supabase/tests/seed.sql
--
-- Idempotent local-dev fixtures. Safe to re-run (all writes use ON CONFLICT
-- / NOT EXISTS guards and fixed UUIDs, so repeated runs are no-ops).
-- NEVER run against production.
--
-- Covers: signup-trigger path, prompt-saving workflow, guest-usage /
-- rate-limit row, optimization log + feedback rating.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/tests/seed.sql
--   npm run db:seed

BEGIN;

-- 1. Auth user (exercises handle_new_user trigger where present).
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'seed@example.com',
  '{"full_name":"Seed User"}'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Profile row (trigger creates it on Supabase; stub instances may need it).
INSERT INTO public.pp_user_profiles (id, email, display_name)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'seed@example.com',
  'seed_user'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Optimization history row (prompt-saving workflow source).
INSERT INTO public.pp_optimization_history
  (id, session_id, prompt_original, prompt_optimized, mode, explanation, provider, share_id)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  'seed-session-1',
  'Write a poem about the sea.',
  'Compose a vivid 12-line poem about the sea at dawn. Constraints: …',
  'better',
  'Added constraints, length target, and imagery guidance.',
  'gemini',
  'seedshare01'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Saved prompt linked back to the history row.
INSERT INTO public.pp_saved_prompts
  (id, user_id, title, original_prompt, optimized_prompt, explanation, mode, provider, source_history_id)
VALUES (
  '44444444-4444-4444-8444-444444444444',
  '22222222-2222-4222-8222-222222222222',
  'Seed: sea poem',
  'Write a poem about the sea.',
  'Compose a vivid 12-line poem about the sea at dawn. Constraints: …',
  'Added constraints, length target, and imagery guidance.',
  'better',
  'gemini',
  '33333333-3333-4333-8333-333333333333'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Guest-usage row (rate-limit workflow: 2 of 5 free used).
INSERT INTO public.guest_usage (guest_id, optimization_count, last_mode, last_provider)
VALUES ('seed-guest-1', 2, 'better', 'gemini')
ON CONFLICT (guest_id) DO NOTHING;

-- 6. Optimization log + feedback rating (thumbs-up path).
INSERT INTO public.optimization_logs
  (session_id, mode, version, provider, model, prompt_length, optimized_length, feedback, prompt_score)
VALUES
  ('seed-session-1', 'better', 'seed-1', 'gemini', 'gemini-3.5-flash', 28, 71, 'up', 82)
ON CONFLICT DO NOTHING;

COMMIT;
