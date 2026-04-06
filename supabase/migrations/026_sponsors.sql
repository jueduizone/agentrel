-- 026_sponsors.sql
-- 项目方实体表，管理员维护，grants 关联 sponsor_id

CREATE TABLE IF NOT EXISTS public.sponsors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,          -- URL-friendly，如 zama / openbuild
  logo_url    TEXT,                          -- logo 图片地址
  website_url TEXT,                          -- 官网
  description TEXT,                          -- 一句话简介
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- grants 表关联
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sponsors" ON public.sponsors FOR SELECT USING (true);
CREATE POLICY "service role all sponsors" ON public.sponsors USING (auth.role() = 'service_role');

GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT ON public.sponsors TO authenticated;
GRANT ALL   ON public.sponsors TO service_role;

-- 先插入 Zama（第一个项目方）
INSERT INTO public.sponsors (name, slug, logo_url, website_url, description)
VALUES (
  'Zama',
  'zama',
  'https://avatars.githubusercontent.com/u/97179822',
  'https://zama.ai',
  'Building open source FHE solutions for blockchain and AI'
) ON CONFLICT (slug) DO NOTHING;
