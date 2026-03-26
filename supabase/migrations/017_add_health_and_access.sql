-- 健康度字段
ALTER TABLE skills ADD COLUMN IF NOT EXISTS health_score integer DEFAULT 100;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS install_count integer DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS error_count integer DEFAULT 0;

-- 访问控制字段（为后续 Pro/Partner Key 做准备）
ALTER TABLE skills ADD COLUMN IF NOT EXISTS access text DEFAULT 'free' CHECK (access IN ('free', 'pro', 'partner'));
ALTER TABLE skills ADD COLUMN IF NOT EXISTS preview_lines integer DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS partner_id text;
