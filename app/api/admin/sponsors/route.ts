import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

// GET /api/admin/sponsors - 管理员获取所有 sponsors
export async function GET(req: NextRequest) {
  const { data, error } = await serviceClient
    .from('sponsors')
    .select('id, name, slug, logo_url, website_url, description, is_active')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/sponsors - 创建 sponsor
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, slug, logo_url, website_url, description } = body
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })
  const { data, error } = await serviceClient
    .from('sponsors')
    .insert({ name, slug, logo_url, website_url, description })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
