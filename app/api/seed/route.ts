import { NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/seed'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seed endpoint is disabled in production' },
      { status: 403 }
    )
  }

  const results = await seedDatabase()

  return NextResponse.json({ results })
}
