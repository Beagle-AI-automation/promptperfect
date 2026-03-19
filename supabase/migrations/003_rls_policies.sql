-- Enable RLS and allow anon to insert/update (for feedback and stats)
alter table optimization_logs enable row level security;

create policy "Allow anon insert" on optimization_logs
  for insert to anon with check (true);

create policy "Allow anon update" on optimization_logs
  for update to anon using (true) with check (true);

create policy "Allow anon select" on optimization_logs
  for select to anon using (true);
