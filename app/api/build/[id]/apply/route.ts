import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/agentAuth'

/**
 * POST /api/build/{id}/apply
 * Submit an application for a grant/bounty. Requires Bearer token (api_key or access_token).
 * Body fields are determined by the grant's application_schema.
 * Always accepted: { pitch: string, custom_fields: Record<string, unknown> }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({
      error: 'Unauthorized — provide Bearer token (api_key or access_token from /api/auth/login)',
    }, { status: 401 })
  }

  const { id: grantId } = await params
  const db = serviceClient

  const { data: grant } = await db
    .from('grants')
    .select('id, title, status, deadline, application_schema')
    .eq('id', grantId)
    .single()

  if (!grant) return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  if (grant.status !== 'open') return NextResponse.json({ error: 'Grant is not open' }, { status: 400 })
  if (grant.deadline && new Date(grant.deadline) < new Date()) {
    return NextResponse.json({ error: 'Grant deadline has passed' }, { status: 400 })
  }

  const { data: existing } = await db
    .from('grant_applications')
    .select('id, status')
    .eq('grant_id', grantId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already applied', application_id: existing.id, status: existing.status }, { status: 409 })
  }

  const body = await request.json().catch(() => ({}))

  // Validate required fields from application_schema
  let appSchema: Array<{ name: string; label: string; type: string; required?: boolean }> = []
  try {
    if (grant.application_schema) {
      appSchema = typeof grant.application_schema === 'string'
        ? JSON.parse(grant.application_schema)
        : grant.application_schema
    }
  } catch { /* ignore parse errors */ }

  const customFields = (body.custom_fields as Record<string, unknown>) ?? {}
  const pitch = (body.pitch as string) ?? null

  for (const field of appSchema) {
    if (field.required && !customFields[field.name] && field.name !== 'pitch') {
      return NextResponse.json({ error: `Required field missing: ${field.name} (${field.label})` }, { status: 400 })
    }
  }

  const { data: application, error } = await db
    .from('grant_applications')
    .insert({
      grant_id: grantId,
      user_id: user.id,
      pitch,
      custom_fields: customFields,
    })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    application_id: application.id,
    grant_id: grantId,
    grant_title: grant.title,
    status: 'pending',
    message: 'Application submitted successfully.',
  }, { status: 201 })
}
