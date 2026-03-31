import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

// GET /api/v1/grants/:id/my-application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: grantId } = await params
  const { data, error } = await serviceClient
    .from('grant_applications')
    .select('id, grant_id, status, pitch, reputation_snapshot, created_at')
    .eq('grant_id', grantId).eq('user_id', user.id).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No application found' }, { status: 404 })
  return NextResponse.json(data)
}
