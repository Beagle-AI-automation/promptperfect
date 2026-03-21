-- PromptPerfect Database Setup
-- Run this entire file in Supabase Dashboard → SQL Editor
-- https://ideifzsqrpygaxisisuj.supabase.co/

-- 1. Create pp_optimization_history table for storing optimization results
CREATE TABLE IF NOT EXISTS pp_optimization_history (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  prompt_original text not null,
  prompt_optimized text not null,
  mode text not null,
  explanation text default '',
  share_id text unique,
  created_at timestamptz default now()
);

-- Add index on session_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_session_id 
  ON pp_optimization_history(session_id);

-- Add index on share_id for quick public lookups
CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_share_id 
  ON pp_optimization_history(share_id) WHERE share_id IS NOT NULL;

-- Add index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_created_at 
  ON pp_optimization_history(created_at DESC);

-- Note: After running this migration, you can generate shareable URLs for optimizations.
-- The share_id field will be populated when a user clicks the "Share" button.
