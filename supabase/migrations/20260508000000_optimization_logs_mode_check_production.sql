-- Allow 'production' mode in optimization_logs (Production Audit runs).
-- normalizeModeForDb maps production runs to 'production' so analytics can
-- break them out separately; the March-era CHECK only allowed
-- better/specific/cot, so those log inserts failed the constraint silently
-- (the logging calls are fire-and-forget). Additive and re-runnable.
ALTER TABLE public.optimization_logs DROP CONSTRAINT IF EXISTS optimization_logs_mode_check;
ALTER TABLE public.optimization_logs ADD CONSTRAINT optimization_logs_mode_check
  CHECK (mode IN ('better', 'specific', 'cot', 'production'));
