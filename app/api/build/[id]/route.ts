import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

/**
 * GET /api/build/{id}
 * Returns full grant/bounty detail including application_schema for AI Agents.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = serviceClient

  const { data, error } = await db.from('grants').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { count } = await db
    .from('grant_applications')
    .select('*', { count: 'exact', head: true })
    .eq('grant_id', id)

  return NextResponse.json({
    ...data,
    application_count: count ?? 0,
    _apply_endpoint: `POST /api/build/${id}/apply`,
    _schema_note: 'Use application_schema to understand required fields for apply endpoint',
  })
}
