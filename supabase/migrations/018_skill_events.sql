-- 技能调用事件表（不存 IP，只记录使用行为）
CREATE TABLE IF NOT EXISTS skill_events (
  id bigserial PRIMARY KEY,
  skill_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'api_fetch', -- api_fetch | page_view | copy
  user_agent text,
  referer text,
  ecosystem text,
  created_at timestamptz DEFAULT now()
);

-- 按 skill_id + 时间查询的索引
CREATE INDEX IF NOT EXISTS idx_skill_events_skill_id ON skill_events(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_events_created_at ON skill_events(created_at);

-- RLS（service key 写入，无需 anon）
ALTER TABLE skill_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON skill_events
  USING (true) WITH CHECK (true);

-- 原子递增 install_count 的 RPC 函数
CREATE OR REPLACE FUNCTION increment_install_count(skill_id_arg text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE skills SET install_count = COALESCE(install_count, 0) + 1
  WHERE id = skill_id_arg;
$$;
