import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/agentAuth'
import { serviceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    wallet_address?: string
    human_did?: string
    signature?: string
  }
  const { wallet_address, human_did, signature } = body

  if (!wallet_address && !human_did) {
    return NextResponse.json({ error: 'Provide at least one of wallet_address or human_did' }, { status: 400 })
  }

  // Validate wallet format if provided
  if (wallet_address && !/^0x[0-9a-fA-F]{40}$/.test(wallet_address)) {
    return NextResponse.json({ error: 'Invalid wallet_address format (expected 0x... with 42 chars)' }, { status: 400 })
  }

  // Validate signature format (EIP-191: 0x + 130 hex chars = 65 bytes)
  if (wallet_address && signature !== undefined) {
    if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      return NextResponse.json({ error: 'Invalid signature format (expected 0x + 130 hex chars)' }, { status: 400 })
    }
    // TODO: Full EIP-191 signature verification with ethers.js if needed
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
    message: 'Identity bound successfully',
  })
}
