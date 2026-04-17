import { serviceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: latestRow } = await serviceClient
    .from('eval_results')
    .select('run_at')
    .order('run_at', { ascending: false })
    .limit(1)

  const run_at = latestRow?.[0]?.run_at

  let total = 0
  let page = 0
  while (true) {
    const { data: batch } = await serviceClient
      .from('eval_results')
      .select('question_id')
      .eq('run_at', run_at)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!batch || batch.length === 0) break
    total += batch.length
    if (batch.length < 1000) break
    page++
  }

  return NextResponse.json({ run_at, total_rows: total })
}
