import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

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
