import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

async function requireAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (user.role !== 'admin') return { error: 'Forbidden: admin only', status: 403 }
  return { user }
}

// PATCH /api/admin/grants/:id/applications/:appId — update application status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const check = await requireAdmin(request)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { id: grantId, appId } = await params
  const body = await request.json().catch(() => ({}))
  const { status } = body

  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Must be approved, rejected, or pending.' }, { status: 400 })
  }

  const db = serviceClient
  const { data, error } = await db
    .from('grant_applications')
    .update({ status })
    .eq('id', appId)
    .eq('grant_id', grantId)
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  return NextResponse.json(data)
}
