import { serviceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { ApplyCTA } from './ApplyCTA'

async function getGrant(id: string) {
  const db = serviceClient
  const { data: grant } = await db.from('grants').select('*').eq('id', id).single()
  if (!grant) return null
  const { count } = await db
    .from('grant_applications')
    .select('*', { count: 'exact', head: true })
    .eq('grant_id', id)
  return { ...grant, application_count: count ?? 0 }
}

export default async function GrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const grant = await getGrant(id)
  if (!grant) notFound()

  const isOpen = grant.status === 'open'
  const deadline = grant.deadline ? new Date(grant.deadline) : null
  const isPast = deadline && deadline < new Date()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/build" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← Build</Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-xl font-bold text-gray-900">{grant.title}</h1>
                {grant.source_type === 'external' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">External</span>
                )}
                {grant.source_type === 'native' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Native</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {grant.sponsor && <span>by {grant.sponsor}</span>}
                <span>{grant.application_count} 人已申请</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isOpen && !isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {isOpen && !isPast ? '开放中' : '已截止'}
                </span>
              </div>
            </div>
            {grant.reward && (
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-indigo-700">{grant.reward}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {grant.description && (
            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{grant.description}</p>
            </div>
          )}

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            {deadline && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">截止日期</p>
                <p className={`font-medium ${isPast ? 'text-red-500' : 'text-gray-800'}`}>
                  {deadline.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}
            {grant.track && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">赛道 / 方向</p>
                <p className="font-medium text-gray-800">{grant.track}</p>
              </div>
            )}
            {grant.max_applications && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">名额上限</p>
                <p className="font-medium text-gray-800">{grant.max_applications}</p>
              </div>
            )}
            {grant.required_skills && Array.isArray(grant.required_skills) && grant.required_skills.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-gray-400 mb-1">Required Skills</p>
                <div className="flex flex-wrap gap-1">
                  {grant.required_skills.map((s: string) => (
                    <span key={s} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {grant.tech_requirements && (
              <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">技术要求</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{grant.tech_requirements}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-100">
            {grant.source_type === 'external' && grant.external_url && (
              <a href={grant.external_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                🔗 查看原网站
              </a>
            )}
          </div>

          {/* Apply CTA — two buttons */}
          <ApplyCTA grantId={id} isOpen={isOpen && !isPast} />
        </div>
      </main>
    </div>
  )
}


