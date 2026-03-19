-- Fix mode check constraint: allow only 'better', 'specific', 'cot'
-- Run this in Supabase SQL Editor if not using migrations.
ALTER TABLE optimization_logs DROP CONSTRAINT IF EXISTS optimization_logs_mode_check;
ALTER TABLE optimization_logs ADD CONSTRAINT optimization_logs_mode_check
  CHECK (mode IN ('better', 'specific', 'cot'));
