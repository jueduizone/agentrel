import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

async function trackUsage(skillId: string, ecosystem: string, request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') ?? ''
    const referer = request.headers.get('referer') ?? ''

    await Promise.all([
      // 记录事件（时间戳 + UA + referer，无 IP）
      serviceClient.from('skill_events').insert({
        skill_id: skillId,
        event_type: 'api_fetch',
        user_agent: userAgent.slice(0, 256),
        referer: referer.slice(0, 256),
        ecosystem,
      }),
      // 累加 install_count
      serviceClient.rpc('increment_install_count', { skill_id_arg: skillId }),
    ])
  } catch {
    // 追踪失败不影响正常响应
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  const { id } = await params
  const lastSegment = id[id.length - 1]
  const isMdRequest = lastSegment.endsWith('.md')
  if (isMdRequest) id[id.length - 1] = lastSegment.slice(0, -3)
  const skillId = id.join('/')
  const format = isMdRequest ? 'raw' : request.nextUrl.searchParams.get('format')

  const { data, error } = await serviceClient
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single()

  if (error || !data) {
    if (format === 'raw') return new NextResponse('Skill not found', { status: 404 })
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  if (format === 'raw') {
    // 异步追踪，不阻塞响应
    trackUsage(skillId, data.ecosystem as string, request)

    return new NextResponse(data.content as string, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  return NextResponse.json({ data })
}
