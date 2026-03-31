import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

/**
 * GET /api/reputation?email=xxx  — public lookup
 * GET /api/reputation             — own reputation (requires auth)
 *
 * Returns reputation computed from grant_applications in agentrel.
 * For richer cross-platform reputation (hackathon scores), those come
 * from hackagent's developer_reputation table (separate integration).
 */
export async function GET(request: NextRequest) {
  const db = serviceClient
  const { searchParams } = request.nextUrl
  const emailParam = searchParams.get('email')

  let email: string | null = emailParam

  if (!email) {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: userRow } = await db
      .from('users')
      .select('email, wallet_address, human_did')
      .eq('id', user.id)
      .single()
    email = userRow?.email ?? null

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }
  }

  // Look up user
  const { data: userRow } = await db
    .from('users')
    .select('id, wallet_address, human_did')
    .eq('email', email)
    .maybeSingle()

  if (!userRow) {
    // New user — return empty reputation
    return NextResponse.json({
      email,
      grant_applications: 0,
      approved_grants: 0,
      wallet_address: null,
      human_did: null,
      message: 'No reputation data yet.',
    })
  }

  // Count grant applications and approvals
  const [{ count: totalApps }, { count: approvedApps }] = await Promise.all([
    db.from('grant_applications').select('*', { count: 'exact', head: true }).eq('user_id', userRow.id),
    db.from('grant_applications').select('*', { count: 'exact', head: true }).eq('user_id', userRow.id).eq('status', 'approved'),
  ])

  return NextResponse.json({
    email,
    grant_applications: totalApps ?? 0,
    approved_grants: approvedApps ?? 0,
    approval_rate: totalApps ? Math.round(((approvedApps ?? 0) / totalApps) * 100) : 0,
    wallet_address: userRow.wallet_address ?? null,
    human_did: userRow.human_did ?? null,
  })
}
