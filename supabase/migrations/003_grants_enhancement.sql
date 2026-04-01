-- 003_grants_enhancement.sql
-- Run in Supabase Dashboard > SQL Editor

-- grants 表补字段
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'native' CHECK (source_type IN ('external', 'native')),
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS template_md TEXT,
  ADD COLUMN IF NOT EXISTS application_schema JSONB,
  ADD COLUMN IF NOT EXISTS max_applications INTEGER,
  ADD COLUMN IF NOT EXISTS track TEXT,
  ADD COLUMN IF NOT EXISTS tech_requirements TEXT;

-- grant_submissions 表
CREATE TABLE IF NOT EXISTS public.grant_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.grant_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewer_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.grant_submissions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.grant_submissions TO service_role;
GRANT SELECT ON public.grant_submissions TO anon;
GRANT ALL ON public.grant_submissions TO authenticated;
