import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

async function requireAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (user.role !== 'admin') return { error: 'Forbidden: admin only', status: 403 }
  return { user }
}

// PATCH /api/admin/grants/[id] — update a grant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin(request)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { id } = await params
  const body = await request.json()

  const allowed = [
    'title', 'description', 'sponsor', 'reward', 'deadline', 'status',
    'source_type', 'external_url', 'template_md', 'application_schema',
    'max_applications', 'track', 'tech_requirements', 'required_skills', 'min_reputation_score',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] === '' ? null : body[key]
  }

  const { error } = await serviceClient.from('grants').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/grants/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin(request)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { id } = await params
  const { error } = await serviceClient.from('grants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
