-- Quality score (1-100) parsed from model output (`---SCORE---NN---`).
-- Written fire-and-forget by /api/optimize and /api/optimize-sync whenever
-- the model emits a score. Previously only present via legacy setup.sql —
-- this brings it into the versioned series so fresh databases have the
-- column instead of failing those inserts.
ALTER TABLE public.optimization_logs
  ADD COLUMN IF NOT EXISTS prompt_score integer;
