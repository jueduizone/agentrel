import { serviceClient } from '@/lib/supabase'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Suspense } from 'react'
import { BuildTabs } from './BuildClient'

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Grants & Bounties</h1>
          <p className="text-sm text-gray-500 mt-1">Web3 developer grants &amp; bounties — apply with your AI agent</p>
        </div>

        <Suspense fallback={null}>
          <BuildTabs
            total={allGrants.length}
            openCount={open.length}
            closedCount={closed.length}
            current={filter}
          />
        </Suspense>

        {displayed.length === 0 && (
          <p className="text-center text-gray-400 py-16">
            {filter === 'open' ? 'No open grants at the moment.' : filter === 'closed' ? 'No closed grants.' : 'No grants found.'}
          </p>
        )}

        <div className={`space-y-4 ${filter === 'closed' ? 'opacity-75' : ''}`}>
          {displayed.map(g => <GrantCard key={g.id} grant={g} />)}
        </div>
      </main>
    </div>
  )
}

function GrantCard({ grant }: { grant: {
  id: string; title: string; description: string | null; sponsor: string | null; sponsor_id: string | null
  sponsors: { name: string; logo_url: string | null; website_url: string | null } | null
  reward: string | null; deadline: string | null; status: string
  source_type?: string; track?: string | null; application_count: number
}}) {
  const isOpen = grant.status === 'open'
  const deadlineDate = grant.deadline ? new Date(grant.deadline) : null
  const isPast = deadlineDate && deadlineDate < new Date()

  return (
    <Link href={`/build/${grant.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-base group-hover:text-indigo-700 transition-colors">{grant.title}</h3>
              {grant.source_type === 'external' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">External</span>
              )}
              {grant.source_type === 'native' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Native</span>
              )}
              {grant.track && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{grant.track}</span>
              )}
            </div>
          </div>
          {/* Reward + status badge */}
          <div className="text-right shrink-0">
            {grant.reward && <p className="font-bold text-indigo-700 text-sm">{grant.reward}</p>}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${isOpen && !isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {isOpen && !isPast ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>

        {/* Info bar: Sponsor · deadline · count */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          {(grant.sponsors || grant.sponsor) ? (
            <span className="flex items-center gap-1 font-medium text-gray-700">
              {grant.sponsors?.logo_url
                ? <img src={grant.sponsors.logo_url} alt={grant.sponsors.name} className="w-4 h-4 rounded-full object-cover" />
                : <span>🏢</span>}
              {grant.sponsors?.website_url
                ? <a href={grant.sponsors.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{grant.sponsors.name ?? grant.sponsor}</a>
                : <span>{grant.sponsors?.name ?? grant.sponsor}</span>}
            </span>
          ) : null}
          {(grant.sponsors || grant.sponsor) && deadlineDate && <span className="text-gray-300">·</span>}
          {deadlineDate && (
            <span className={isPast ? 'text-red-400' : ''}>
              Deadline: {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {(grant.sponsor || deadlineDate) && <span className="text-gray-300">·</span>}
          <span>{grant.application_count} applied</span>
        </div>

        {/* Description */}
        {grant.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{grant.description}</p>
        )}
      </div>
    </Link>
  )
}
