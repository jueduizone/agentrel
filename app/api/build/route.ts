import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

/**
 * GET /api/build
 * Public endpoint for AI Agents to list grants and bounties.
 * Query params:
 *   type=grant|bounty  (optional, filters by source_type or type field)
 *   status=open|closed (default: open)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')     // 'grant' | 'bounty' | null
  const status = searchParams.get('status') ?? 'open'

  const db = serviceClient
  let query = db
    .from('grants')
    .select('id, title, sponsor, reward, deadline, status, source_type, track, created_at')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (type) {
    // 'bounty' maps to short-deadline task-style grants; for now filter by track keyword
    // In future add a `type` column. For now return all and let agent decide.
    query = query.ilike('track', `%${type}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    items: data ?? [],
    count: (data ?? []).length,
    _note: 'Use GET /api/build/{id} for full details including application_schema',
  })
}
