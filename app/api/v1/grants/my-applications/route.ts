import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

// GET /api/v1/grants/my-applications — list all grant applications by current user
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await serviceClient
    .from('grant_applications')
    .select(`
      id,
      grant_id,
      status,
      pitch,
      reputation_snapshot,
      created_at,
      grants(id, title, description, reward, deadline, status)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const applications = (data ?? []).map(a => ({
    ...a,
    grant_title: (a.grants as { title?: string } | null)?.title ?? '',
  }))

  return NextResponse.json({ applications, total: applications.length })
}
