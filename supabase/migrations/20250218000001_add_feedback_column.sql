-- Add feedback column for thumbs up/down (rating column remains unchanged)
ALTER TABLE public.optimization_logs ADD COLUMN IF NOT EXISTS feedback text;
