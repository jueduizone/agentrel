-- AgentRel Eval Results Storage
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zkpeutvzmrfhlzpsbyhr/sql/new

-- Main eval runs table
create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  run_date date not null,
  judge_model text not null default 'gpt-4o-mini',
  inject_mode text not null default 'slice',  -- 'full' | 'slice'
  total_questions int not null,
  avg_control numeric(4,2) not null,
  avg_test numeric(4,2) not null,
  delta numeric(4,2) generated always as (avg_test - avg_control) stored,
  label text,   -- e.g. 'v2.0-50q', 'v2.1-20q'
  notes text
);

-- Per-question results
create table if not exists public.eval_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.eval_runs(id) on delete cascade,
  question_id text not null,   -- e.g. 'Q01'
  category text not null,
  skill_id text not null,
  skill_found boolean not null default true,
  control_score int not null check (control_score between 0 and 5),
  test_score int not null check (test_score between 0 and 5),
  faithfulness int check (faithfulness between 0 and 5)
);

-- Category aggregates (materialized view alternative — simple view)
create or replace view public.eval_category_stats as
select
  r.run_id,
  r.category,
  round(avg(r.control_score)::numeric, 2) as avg_control,
  round(avg(r.test_score)::numeric, 2) as avg_test,
  round((avg(r.test_score) - avg(r.control_score))::numeric, 2) as delta,
  count(*) as question_count
from public.eval_results r
group by r.run_id, r.category;

-- RLS: public read, no auth needed for benchmark page
alter table public.eval_runs enable row level security;
alter table public.eval_results enable row level security;

create policy "eval_runs public read" on public.eval_runs for select using (true);
create policy "eval_results public read" on public.eval_results for select using (true);
create policy "eval_runs service insert" on public.eval_runs for insert with check (true);
create policy "eval_results service insert" on public.eval_results for insert with check (true);

-- Grant to service role
grant all on public.eval_runs to service_role;
grant all on public.eval_results to service_role;
grant select on public.eval_category_stats to anon, authenticated, service_role;
