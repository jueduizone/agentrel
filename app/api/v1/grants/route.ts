import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

// GET /api/v1/grants — list open grants (public)
export async function GET(request: NextRequest) {
  const db = serviceClient
  const { searchParams } = request.nextUrl
  const sponsor = searchParams.get('sponsor')

  let query = db
    .from('grants')
    .select('id, title, description, sponsor, reward, deadline, required_skills, min_reputation_score, status, created_at, source_type, external_url, template_md, max_applications, track, tech_requirements')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (sponsor) query = query.ilike('sponsor', `%${sponsor}%`)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
