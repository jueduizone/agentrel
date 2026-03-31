import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

async function requireAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (user.role !== 'admin') return { error: 'Forbidden', status: 403 }
  return { user }
}

async function sendMailgun(to: string, subject: string, text: string) {
  const key = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN ?? 'build.openbuild.xyz'
  if (!key) return

  await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`api:${key}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      from: `AgentRel <noreply@${domain}>`,
      to,
      subject,
      text,
    }).toString(),
  }).catch(e => console.error('[mailgun]', e))
}

// PATCH /api/admin/grants/:grantId/applications/:appId
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ grantId: string; appId: string }> }
) {
  const check = await requireAdmin(request)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { grantId, appId } = await params
  const { status } = await request.json().catch(() => ({}))

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const db = serviceClient

  // Get application + grant + user info
  const { data: app } = await db
    .from('grant_applications')
    .select('id, user_id, grant_id')
    .eq('id', appId)
    .eq('grant_id', grantId)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  // Update status
  const { error } = await db
    .from('grant_applications')
    .update({ status })
    .eq('id', appId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email notification async
  const [{ data: userRow }, { data: grant }] = await Promise.all([
    db.from('users').select('email').eq('id', app.user_id).single(),
    db.from('grants').select('title').eq('id', grantId).single(),
  ])

  if (userRow?.email && grant?.title) {
    const grantTitle = grant.title
    if (status === 'approved') {
      await sendMailgun(
        userRow.email,
        `✅ Your application for "${grantTitle}" has been approved!`,
        `Congratulations!\n\nYour application for "${grantTitle}" has been approved.\n\nThe AgentRel team will be in touch with next steps.\n\nhttps://agentrel.vercel.app/admin`
      )
    } else {
      await sendMailgun(
        userRow.email,
        `Your application for "${grantTitle}"`,
        `Thank you for applying to "${grantTitle}".\n\nAfter careful review, we were not able to select your application this time.\n\nWe encourage you to keep building and apply to future opportunities!\n\nhttps://agentrel.vercel.app/api/v1/grants`
      )
    }
  }

  return NextResponse.json({ id: appId, status, message: `Application ${status}` })
}
