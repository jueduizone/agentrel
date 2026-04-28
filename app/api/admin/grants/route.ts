import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'
import { upsertGrantSkill, syncGrantsIndex } from '@/lib/grantSkill'

async function requireAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (user.role !== 'admin') return { error: 'Forbidden: admin only', status: 403 }
  return { user }
}

// GET /api/admin/grants — all grants with application counts
export async function GET(request: NextRequest) {
  const check = await requireAdmin(request)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const db = serviceClient
  const { data: grants, error } = await db
    .from('grants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get application counts per grant
  const grantIds = (grants ?? []).map(g => g.id)
  const { data: appCounts } = await db
    .from('grant_applications')
    .select('grant_id, status')
    .in('grant_id', grantIds)

  const countMap: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {}
  for (const app of appCounts ?? []) {
    if (!countMap[app.grant_id]) countMap[app.grant_id] = { total: 0, pending: 0, approved: 0, rejected: 0 }
    countMap[app.grant_id].total++
    countMap[app.grant_id][app.status as 'pending' | 'approved' | 'rejected']++
  }

  return NextResponse.json(
    (grants ?? []).map(g => ({ ...g, _stats: countMap[g.id] ?? { total: 0, pending: 0, approved: 0, rejected: 0 } }))
  )
}

// POST /api/admin/grants — create a grant
export async function POST(request: NextRequest) {
  const check = await requireAdmin(request)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const body = await request.json()
  const {
    title, description, sponsor, sponsor_id, reward, deadline, status = 'open',
    source_type = 'native', external_url, template_md, application_schema,
    max_applications, track, tech_requirements, required_skills, min_reputation_score,
  } = body

  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const { data, error } = await serviceClient
    .from('grants')
    .insert({
      title, description, sponsor, sponsor_id: sponsor_id || null, reward,
      deadline: deadline || null,
      status,
      source_type,
      external_url: external_url || null,
      template_md: template_md || null,
      application_schema: application_schema || null,
      max_applications: max_applications || null,
      track: track || null,
      tech_requirements: tech_requirements || null,
      required_skills: required_skills || null,
      min_reputation_score: min_reputation_score || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-sync grant skill card
  upsertGrantSkill({ id: data.id, title, description, reward, deadline, status, sponsor, track, application_schema, tech_requirements, required_skills }).catch(() => {})
  syncGrantsIndex().catch(() => {})

  return NextResponse.json({ id: data.id }, { status: 201 })
}
