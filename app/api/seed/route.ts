import { NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/seed'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (process.env.NODE_ENV === 'production' && secret !== 'agentrel-seed-2026') {
    return NextResponse.json(
      { error: 'Seed endpoint is disabled in production' },
      { status: 403 }
    )
  }

  const results = await seedDatabase()

  return NextResponse.json({ results })
}
