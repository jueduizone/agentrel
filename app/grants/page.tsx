import { serviceClient } from '@/lib/supabase'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'

async function getGrants() {
  const db = serviceClient
  const { data: grants } = await db
    .from('grants')
    .select('id, title, description, sponsor, reward, deadline, status, source_type, track, created_at')
    .order('created_at', { ascending: false })

  // Get application counts
  const ids = (grants ?? []).map(g => g.id)
  const { data: apps } = ids.length
    ? await db.from('grant_applications').select('grant_id').in('grant_id', ids)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const a of apps ?? []) countMap[a.grant_id] = (countMap[a.grant_id] ?? 0) + 1

  return (grants ?? []).map(g => ({ ...g, application_count: countMap[g.id] ?? 0 }))
}

export default async function GrantsPage() {
  const grants = await getGrants()
  const open = grants.filter(g => g.status === 'open')
  const closed = grants.filter(g => g.status !== 'open')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Grants & Bounties</h1>
          <p className="text-sm text-gray-500 mt-1">Web3 开发者资助计划，Apply with AI Agent</p>
        </div>

        {open.length === 0 && closed.length === 0 && (
          <p className="text-center text-gray-400 py-16">暂无 Grant 项目</p>
        )}

        {open.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">开放中 ({open.length})</h2>
            <div className="space-y-4">
              {open.map(g => <GrantCard key={g.id} grant={g} />)}
            </div>
          </section>
        )}

        {closed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">已截止 ({closed.length})</h2>
            <div className="space-y-3 opacity-60">
              {closed.map(g => <GrantCard key={g.id} grant={g} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function GrantCard({ grant }: { grant: {
  id: string; title: string; description: string | null; sponsor: string | null
  reward: string | null; deadline: string | null; status: string
  source_type?: string; track?: string | null; application_count: number
}}) {
  const isOpen = grant.status === 'open'
  const deadlineDate = grant.deadline ? new Date(grant.deadline) : null
  const isPast = deadlineDate && deadlineDate < new Date()

  return (
    <Link href={`/grants/${grant.id}`} className="block">
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-gray-900 text-base">{grant.title}</h3>
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
            {grant.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{grant.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            {grant.reward && <p className="font-semibold text-indigo-700 text-sm">{grant.reward}</p>}
            {grant.sponsor && <p className="text-xs text-gray-400">{grant.sponsor}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          {deadlineDate && (
            <span className={isPast ? 'text-red-400' : ''}>
              截止 {deadlineDate.toLocaleDateString('zh-CN')}
            </span>
          )}
          <span>{grant.application_count} 人已申请</span>
          <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full font-medium ${isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isOpen ? '开放中' : '已截止'}
          </span>
        </div>
      </div>
    </Link>
  )
}
