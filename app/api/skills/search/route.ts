import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  const ecosystem = request.nextUrl.searchParams.get('ecosystem') ?? ''
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '10'), 50)

  if (!q.trim()) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 })
  }

  // 语义搜索（默认开启，semantic=0 时强制跳过）
  const skipSemantic = request.nextUrl.searchParams.get('semantic') === '0'
  const apiKey = process.env.OPENAI_API_KEY

  if (!skipSemantic && apiKey) {
    try {
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ input: q, model: 'text-embedding-3-small' }),
      })
      const embJson = await embRes.json()
      const embedding = embJson.data?.[0]?.embedding

      if (embedding) {
        const { data, error } = await serviceClient.rpc('match_skills', {
          query_embedding: embedding,
          match_count: limit,
          filter_ecosystem: ecosystem || null,
        })
        if (!error && data?.length) {
          return NextResponse.json({ data, mode: 'semantic' })
        }
      }
    } catch {
      // fall through to keyword search
    }
  }

  // Fallback：全文关键词搜索（id + name + description + tags）
  let query = serviceClient
    .from('skills')
    .select('id, name, ecosystem, type, source, tags, health_score, install_count, description')
    .or(`name.ilike.%${q}%,id.ilike.%${q}%,description.ilike.%${q}%,content.ilike.%${q}%`)
    .order('install_count', { ascending: false })
    .limit(limit)

  if (ecosystem) query = query.eq('ecosystem', ecosystem)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 返回结构与 /api/skills 保持一致
  return NextResponse.json({ data: data ?? [], total: data?.length ?? 0, mode: 'keyword' })
}
