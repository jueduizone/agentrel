import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/agentAuth'
import { serviceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const newKey = 'agentrel_' + crypto.randomUUID().replace(/-/g, '')

  const db = serviceClient
  const { error } = await db
    .from('users')
    .update({ api_key: newKey })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    api_key: newKey,
    message: 'API key rotated. Your old key is now invalid.',
  })
}
