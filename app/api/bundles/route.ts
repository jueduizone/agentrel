import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await serviceClient
    .from('bundles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
