import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import type { Bundle, Skill } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: bundle, error } = await serviceClient
    .from('bundles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !bundle) {
    return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
  }

  const b = bundle as Bundle

  // Fetch expanded skill details
  const { data: skills } = await serviceClient
    .from('skills')
    .select('*')
    .in('id', b.skills)

  return NextResponse.json({
    data: {
      ...b,
      skills_detail: (skills ?? []) as Skill[],
    },
  })
}
