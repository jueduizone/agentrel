import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { createHmac } from 'crypto'

async function trackUsage(skillId: string, ecosystem: string, request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') ?? ''
    const referer = request.headers.get('referer') ?? ''
    await Promise.all([
      serviceClient.from('skill_events').insert({
        skill_id: skillId,
        event_type: 'api_fetch',
        user_agent: userAgent.slice(0, 256),
        referer: referer.slice(0, 256),
        ecosystem,
      }),
      serviceClient.rpc('increment_install_count', { skill_id_arg: skillId }),
    ])
  } catch {
    // 追踪失败不影响正常响应
  }
}

/** 验证 Pro/Partner Key（HMAC-SHA256）
 *  Key 格式：agentrel_<role>_<hmac>
 *  role: pro | partner:<partner_id>
 */
function verifyKey(key: string, skillAccess: string, skillPartnerId: string | null): boolean {
  const secret = process.env.AGENTREL_KEY_SECRET
  if (!secret) return false

  const parts = key.split('_')
  if (parts.length < 3 || parts[0] !== 'agentrel') return false

  const role = parts[1]                     // 'pro' | 'partner:xxx'
  const providedHmac = parts.slice(2).join('_')
  const expected = createHmac('sha256', secret).update(role).digest('hex').slice(0, 32)

  if (providedHmac !== expected) return false

  if (skillAccess === 'pro') return role === 'pro' || role.startsWith('partner:')
  if (skillAccess === 'partner') {
    if (!role.startsWith('partner:')) return false
    const keyPartnerId = role.split(':')[1]
    return keyPartnerId === skillPartnerId
  }
  return false
}

/** 截取预览内容（preview_lines 行后替换为提示） */
function makePreview(content: string, previewLines: number): string {
  const lines = content.split('\n')
  const preview = lines.slice(0, previewLines).join('\n')
  return preview + '\n\n---\n> 🔒 This skill requires a Pro or Partner Key to access the full content.\n> Get access at https://agentrel.vercel.app\n'
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
    if (format === 'raw') return new NextResponse('# Skill not found\n', { status: 404 })
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  const access = (data.access as string) ?? 'free'
  const previewLines = (data.preview_lines as number) ?? 30
  const partnerId = (data.partner_id as string | null) ?? null

  // 访问控制：pro / partner skill 需要 Key
  if (access !== 'free' && format === 'raw') {
    const authHeader = request.headers.get('authorization') ?? ''
    const key = (authHeader.replace(/^Bearer\s+/i, '').trim()
      || request.nextUrl.searchParams.get('key')) ?? ''

    const authorized = key ? verifyKey(key, access, partnerId) : false

    if (!authorized) {
      const preview = makePreview(data.content as string, previewLines || 30)
      return new NextResponse(preview, {
        status: 206, // Partial Content
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-AgentRel-Access': access,
          'X-AgentRel-Auth': 'required',
        },
      })
    }
  }

  if (format === 'raw') {
    trackUsage(skillId, data.ecosystem as string, request)
    return new NextResponse(data.content as string, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // JSON 响应：pro/partner skill 隐藏完整 content，只返回预览
  if (access !== 'free') {
    const authHeader = request.headers.get('authorization') ?? ''
    const key = authHeader.replace(/^Bearer\s+/i, '').trim()
    const authorized = key ? verifyKey(key, access, partnerId) : false
    if (!authorized) {
      return NextResponse.json({
        data: {
          ...data,
          content: makePreview(data.content as string, previewLines || 30),
        },
        access_required: access,
      })
    }
  }

  return NextResponse.json({ data })
}
