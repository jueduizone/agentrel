import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  const { id } = await params
  const skillId = id.join('/')
  const format = request.nextUrl.searchParams.get('format')

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single()

  if (error || !data) {
    if (format === 'raw') return new NextResponse('Skill not found', { status: 404 })
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  if (format === 'raw') {
    return new NextResponse(data.content as string, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  return NextResponse.json({ data })
}
