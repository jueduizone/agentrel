-- Admin + Grant Custom Fields Migration
-- Run in agentrel Supabase: https://supabase.com/dashboard/project/zkpeutvzmrfhlzpsbyhr/sql/new

-- 1. Custom application fields for grants
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS application_fields jsonb DEFAULT '[]'::jsonb;

-- 2. Custom field answers in applications
ALTER TABLE public.grant_applications
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- 3. Set role=admin for Ian (placeholder - update email once confirmed)
-- UPDATE public.users SET role = 'admin' WHERE email = 'YOUR_EMAIL_HERE';

-- 4. Verify
-- SELECT id, email, role FROM public.users;
