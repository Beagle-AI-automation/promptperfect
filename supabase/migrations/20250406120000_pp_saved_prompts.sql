-- User prompt library (saved optimized prompts)
CREATE TABLE IF NOT EXISTS public.pp_saved_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  original_prompt text NOT NULL,
  optimized_prompt text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'better',
  provider text NOT NULL DEFAULT 'gemini',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pp_saved_prompts_user_created
  ON public.pp_saved_prompts (user_id, created_at DESC);

ALTER TABLE public.pp_saved_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_saved_prompts_select_own"
  ON public.pp_saved_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "pp_saved_prompts_insert_own"
  ON public.pp_saved_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pp_saved_prompts_update_own"
  ON public.pp_saved_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "pp_saved_prompts_delete_own"
  ON public.pp_saved_prompts FOR DELETE
  USING (auth.uid() = user_id);
