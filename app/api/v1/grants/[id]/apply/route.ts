import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

// POST /api/v1/grants/:id/apply — requires api_key or JWT
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized — provide API Key as Bearer token' }, { status: 401 })

  const { id: grantId } = await params
  const db = serviceClient

  const { data: grant } = await db
    .from('grants').select('id, title, status, min_reputation_score, deadline').eq('id', grantId).single()
  if (!grant) return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  if (grant.status !== 'open') return NextResponse.json({ error: 'Grant is not open' }, { status: 400 })
  if (grant.deadline && new Date(grant.deadline) < new Date()) {
    return NextResponse.json({ error: 'Grant deadline has passed' }, { status: 400 })
  }

  const { data: existing } = await db
    .from('grant_applications').select('id, status')
    .eq('grant_id', grantId).eq('user_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Already applied', application_id: existing.id, status: existing.status }, { status: 409 })

  // Reputation snapshot
  const { data: userRow } = await db.from('users').select('email').eq('id', user.id).single()
  let reputationSnapshot: Record<string, unknown> = {}
  if (userRow?.email) {
    // Try agentrel developer_reputation if exists, skip gracefully
  }

  const body = await request.json().catch(() => ({}))
  const { data: application, error } = await db
    .from('grant_applications')
    .insert({ grant_id: grantId, user_id: user.id, pitch: (body.pitch as string) || null, reputation_snapshot: reputationSnapshot })
    .select('id, status, created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    application_id: application.id,
    grant_id: grantId,
    grant_title: grant.title,
    status: 'pending',
    message: 'Application submitted. Check back for status updates.',
  }, { status: 201 })
}
