import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/agentAuth'
import { serviceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = serviceClient
  const { data } = await db
    .from('users')
    .select('id, email, api_key, wallet_address, human_did, role, created_at, last_seen_at')
    .eq('id', user.id)
    .single()

  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
