import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

async function requireAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (user.role !== 'admin') return { error: 'Forbidden', status: 403 }
  return { user }
}

// GET /api/admin/grants/:id/applications
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin(request)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { id: grantId } = await params
  const db = serviceClient

  const { data, error } = await db
    .from('grant_applications')
    .select('id, grant_id, user_id, pitch, custom_fields, reputation_snapshot, status, created_at')
    .eq('grant_id', grantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with user info
  const userIds = (data ?? []).map(a => a.user_id)
  const { data: users } = await db
    .from('users')
    .select('id, email, wallet_address, human_did')
    .in('id', userIds)

  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))

  return NextResponse.json(
    (data ?? []).map(app => ({ ...app, _user: userMap[app.user_id] ?? null }))
  )
}
