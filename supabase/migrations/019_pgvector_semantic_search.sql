-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- skills 表加 embedding 列（OpenAI text-embedding-3-small 维度 1536）
ALTER TABLE skills ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 向量相似搜索函数
CREATE OR REPLACE FUNCTION match_skills(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter_ecosystem text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  name text,
  ecosystem text,
  type text,
  source text,
  description text,
  tags text[],
  health_score integer,
  install_count integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.ecosystem,
    s.type,
    s.source,
    LEFT(s.content, 300) AS description,
    s.tags,
    s.health_score,
    s.install_count,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM skills s
  WHERE
    s.embedding IS NOT NULL
    AND (filter_ecosystem IS NULL OR s.ecosystem = filter_ecosystem)
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 向量索引（IVFFlat，适合 <200 skills 时先用，数据量大后换 HNSW）
CREATE INDEX IF NOT EXISTS idx_skills_embedding ON skills USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
