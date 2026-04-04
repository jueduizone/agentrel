CREATE TABLE IF NOT EXISTS materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  source_url text,
  source_type text DEFAULT 'manual',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id uuid REFERENCES materials(id) ON DELETE SET NULL,
  content_type text NOT NULL,
  platform text NOT NULL,
  generated_text text NOT NULL,
  prompt_used text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generation_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  material_ids uuid[],
  content_type text NOT NULL,
  platform text NOT NULL,
  generated_text text NOT NULL,
  model_used text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cf_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  url text,
  source text DEFAULT 'manual',
  tags text[] DEFAULT '{}',
  status text DEFAULT 'unused',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cf_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid,
  platform text NOT NULL,
  style text DEFAULT 'professional',
  prompt text,
  content text NOT NULL,
  cover_html text,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON cf_materials TO anon, authenticated, service_role;
GRANT ALL ON cf_generations TO anon, authenticated, service_role;
