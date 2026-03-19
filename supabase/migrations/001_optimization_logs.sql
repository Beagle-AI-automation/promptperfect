-- optimization_logs table for PromptPerfect
create table if not exists optimization_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  mode text not null,
  provider text not null,
  model text not null,
  prompt_length integer not null default 0,
  rating integer, -- 1 = thumbs up, -1 = thumbs down
  created_at timestamptz default now()
);

create index if not exists idx_optimization_logs_session_id on optimization_logs(session_id);
create index if not exists idx_optimization_logs_created_at on optimization_logs(created_at);
