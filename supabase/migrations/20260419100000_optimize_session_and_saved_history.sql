-- Link pp_optimization_history rows to the per-run session used in optimization_logs (feedback).
ALTER TABLE public.pp_optimization_history
  ADD COLUMN IF NOT EXISTS optimize_session_id text;

CREATE INDEX IF NOT EXISTS idx_pp_optimization_history_optimize_session_id
  ON public.pp_optimization_history (optimize_session_id)
  WHERE optimize_session_id IS NOT NULL;

-- Link saved library rows back to a history entry when the user saves from the optimizer.
ALTER TABLE public.pp_saved_prompts
  ADD COLUMN IF NOT EXISTS source_history_id uuid REFERENCES public.pp_optimization_history (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pp_saved_prompts_source_history
  ON public.pp_saved_prompts (source_history_id)
  WHERE source_history_id IS NOT NULL;
