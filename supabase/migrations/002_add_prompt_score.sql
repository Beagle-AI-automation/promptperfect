-- Add prompt_score column for LLM-assigned quality score (1-100)
alter table optimization_logs add column if not exists prompt_score integer;
