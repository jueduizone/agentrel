import type { Metadata } from 'next'
import { serviceClient } from '@/lib/supabase'
import { BuildPageClient } from './BuildPageClient'

export const metadata: Metadata = {
  title: 'Build — AgentRel',
  description: 'Web3 grants & bounties. Apply with your AI agent across Solana, Ethereum, and more.',
}

async function getGrants() {
  const db = serviceClient
  const { data: grants } = await db
    .from('grants')
    .select('id, title, description, sponsor, sponsor_id, reward, deadline, status, source_type, track, created_at, sponsors(name, logo_url, website_url)')
    .order('created_at', { ascending: false })

  const ids = (grants ?? []).map(g => g.id)
  const { data: apps } = ids.length
    ? await db.from('grant_applications').select('grant_id').in('grant_id', ids)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const a of apps ?? []) countMap[a.grant_id] = (countMap[a.grant_id] ?? 0) + 1

  return (grants ?? []).map(g => ({
    ...g,
    sponsors: Array.isArray(g.sponsors) ? (g.sponsors[0] ?? null) : g.sponsors,
    application_count: countMap[g.id] ?? 0,
  }))
}

type StatusFilter = 'open' | 'closed' | 'all'

export default async function GrantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const filter: StatusFilter = (status === 'closed' || status === 'all') ? status : 'open'

  const allGrants = await getGrants()
  const open = allGrants.filter(g => g.status === 'open')
  const closed = allGrants.filter(g => g.status !== 'open')
  const displayed = filter === 'all' ? allGrants : filter === 'closed' ? closed : open

  return (
    <BuildPageClient
      allGrants={allGrants}
      displayed={displayed}
      openCount={open.length}
      closedCount={closed.length}
      filter={filter}
    />
  )
}
