-- Tie optimization_logs feedback to auth users so profile/stats can aggregate
-- without depending on pp_optimization_history.optimize_session_id being present.
ALTER TABLE public.optimization_logs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_optimization_logs_user_id
  ON public.optimization_logs (user_id)
  WHERE user_id IS NOT NULL;
