import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import type { SkillsListResponse } from '@/lib/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const ecosystem = searchParams.get('ecosystem')
  const type = searchParams.get('type')
  const source = searchParams.get('source')
  const q = searchParams.get('q')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  let query = serviceClient
    .from('skills')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (ecosystem) query = query.eq('ecosystem', ecosystem)
  if (type) query = query.eq('type', type)
  if (source) query = query.eq('source', source)
  if (q) query = query.or(`name.ilike.%${q}%,id.ilike.%${q}%`)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const response: SkillsListResponse = {
    data: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  }

  return NextResponse.json(response)
}
