-- AgentRel Eval Results — 单表方案（与 Ian 需求对齐）
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zkpeutvzmrfhlzpsbyhr/sql/new

CREATE TABLE IF NOT EXISTS public.eval_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ DEFAULT now(),
  judge_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  inject_strategy TEXT DEFAULT 'slice',
  category TEXT,
  question_id TEXT,
  question_label TEXT,
  control_score INT CHECK (control_score BETWEEN 0 AND 5),
  test_score INT CHECK (test_score BETWEEN 0 AND 5),
  faithfulness INT CHECK (faithfulness BETWEEN 0 AND 5),
  skill_id TEXT,
  skill_found BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS eval_results_run_at_idx ON public.eval_results(run_at);
CREATE INDEX IF NOT EXISTS eval_results_category_idx ON public.eval_results(category);

-- RLS: public read (needed for /benchmark page)
ALTER TABLE public.eval_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eval_results public read"  ON public.eval_results FOR SELECT USING (true);
CREATE POLICY "eval_results service write" ON public.eval_results FOR INSERT WITH CHECK (true);

GRANT ALL ON public.eval_results TO service_role;
GRANT SELECT ON public.eval_results TO anon, authenticated;
