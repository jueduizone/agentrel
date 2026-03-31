-- AgentRel User System
-- Run in agentrel Supabase: https://supabase.com/dashboard/project/zkpeutvzmrfhlzpsbyhr/sql/new

-- 1. Public users extension table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  api_key text UNIQUE DEFAULT concat('agentrel_', replace(gen_random_uuid()::text, '-', '')),
  wallet_address text,
  human_did text,
  role text DEFAULT 'developer',  -- developer / partner / admin
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz
);

-- 2. Auto-create public.users on Supabase Auth registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Fix grant_applications FK (previously dangling)
ALTER TABLE public.grant_applications
  DROP CONSTRAINT IF EXISTS grant_apps_user_fk;
ALTER TABLE public.grant_applications
  ADD CONSTRAINT grant_apps_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users: own read" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users: own update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users: service all" ON public.users FOR ALL USING (true);
GRANT ALL ON public.users TO service_role;
GRANT SELECT, UPDATE ON public.users TO authenticated;
