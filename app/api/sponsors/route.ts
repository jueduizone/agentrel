import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

// GET /api/sponsors - 公开接口，前台获取 sponsor 列表
export async function GET() {
  const { data, error } = await serviceClient
    .from('sponsors')
    .select('id, name, slug, logo_url, website_url, description')
    .eq('is_active', true)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
