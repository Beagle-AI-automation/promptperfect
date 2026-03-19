-- Create optimization_logs table for tracking optimizations and feedback
CREATE TABLE IF NOT EXISTS public.optimization_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  mode text NOT NULL,
  version text NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  model text NOT NULL DEFAULT '',
  prompt_length integer NOT NULL DEFAULT 0,
  optimized_length integer NOT NULL DEFAULT 0,
  explanation_length integer NOT NULL DEFAULT 0,
  rating text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for feedback updates by session_id
CREATE INDEX IF NOT EXISTS idx_optimization_logs_session_id ON public.optimization_logs (session_id);

-- Enable RLS
ALTER TABLE public.optimization_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon to INSERT (for client-side logOptimization)
CREATE POLICY "Allow anon insert" ON public.optimization_logs
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anon to UPDATE (for feedback API - updates rating by session_id)
CREATE POLICY "Allow anon update" ON public.optimization_logs
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
