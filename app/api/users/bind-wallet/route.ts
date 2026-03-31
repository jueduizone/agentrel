import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/agentAuth'
import { serviceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wallet_address, human_did } = await request.json().catch(() => ({}))

  if (!wallet_address && !human_did) {
    return NextResponse.json({ error: '至少提供 wallet_address 或 human_did 之一' }, { status: 400 })
  }

  // Validate wallet format if provided
  if (wallet_address && !/^0x[0-9a-fA-F]{40}$/.test(wallet_address)) {
    return NextResponse.json({ error: 'wallet_address 格式不正确 (需要 0x... 42位)' }, { status: 400 })
  }

  const db = serviceClient
  const updates: Record<string, string> = {}
  if (wallet_address) updates.wallet_address = wallet_address.toLowerCase()
  if (human_did) updates.human_did = human_did

  const { data, error } = await db
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('id, email, wallet_address, human_did, role')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ...data,
    message: '身份绑定成功',
  })
}
