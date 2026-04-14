import { serviceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { ApplyCTA } from './ApplyCTA'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}
function formatDateLong(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

type SponsorInfo = { name: string; logo_url: string | null; website_url: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getGrant(id: string): Promise<any | null> {
  const db = serviceClient
  const { data: grant } = await db.from('grants').select('*, sponsors(name, logo_url, website_url)').eq('id', id).single()
  if (!grant) return null
  const { count } = await db
    .from('grant_applications')
    .select('*', { count: 'exact', head: true })
    .eq('grant_id', id)
  const rawSponsors = (grant as Record<string, unknown>).sponsors
  const sponsors: SponsorInfo | null = Array.isArray(rawSponsors) ? (rawSponsors[0] ?? null) : (rawSponsors as SponsorInfo | null)
  const { sponsors: _s, ...grantRest } = grant as Record<string, unknown> & typeof grant
  return { ...grantRest, sponsors, application_count: count ?? 0 }
}

export default async function GrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const grant = await getGrant(id)
  if (!grant) notFound()

  const isOpen = grant.status === 'open'
  const deadlineIso: string | null = grant.deadline ?? null
  const isPast = deadlineIso ? new Date(deadlineIso) < new Date() : false

  return (
    <div className="min-h-screen bg-muted/50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/build" className="text-sm text-muted-foreground/50 hover:text-muted-foreground mb-6 inline-block">← Build</Link>

        <div className="bg-background rounded-2xl border border-border p-8">
          {/* Header */}
          <div className="mb-6">
            {/* Title + badges */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{grant.title}</h1>
                {grant.source_type === 'external' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">External</span>
                )}
                {grant.source_type === 'native' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Native</span>
                )}
              </div>
              {/* Reward */}
              {grant.reward && (
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-indigo-700">{grant.reward}</p>
                </div>
              )}
            </div>
            {/* Info bar: Sponsor · deadline · count · status */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground/70 flex-wrap">
              {(grant.sponsors || grant.sponsor) && (
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  {grant.sponsors?.logo_url
                    ? <img src={grant.sponsors.logo_url} alt={grant.sponsors.name} className="w-5 h-5 rounded-full object-cover" />
                    : <span className="text-base">🏢</span>}
                  {grant.sponsors?.website_url
                    ? <a href={grant.sponsors.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{grant.sponsors?.name ?? grant.sponsor}</a>
                    : <span>{grant.sponsors?.name ?? grant.sponsor}</span>}
                </span>
              )}
              {(grant.sponsors || grant.sponsor) && <span className="text-muted-foreground">·</span>}
              {deadlineIso && (
                <span className={isPast ? 'text-red-500' : ''} suppressHydrationWarning>
                  Deadline: {formatDateShort(deadlineIso)}
                </span>
              )}
              {deadlineIso && <span className="text-muted-foreground">·</span>}
              <span>{grant.application_count} applied</span>
              <span className="text-muted-foreground">·</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isOpen && !isPast ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground/70'}`}>
                  {isOpen && !isPast ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>

          {/* Description */}
          {grant.description && (
            <div className="mb-6">
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{grant.description}</p>
            </div>
          )}

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            {deadlineIso && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground/50 mb-0.5">Deadline</p>
                <p className={`font-medium ${isPast ? 'text-red-500' : 'text-foreground'}`} suppressHydrationWarning>
                  {formatDateLong(deadlineIso)}
                </p>
              </div>
            )}
            {grant.track && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground/50 mb-0.5">赛道 / 方向</p>
                <p className="font-medium text-foreground">{grant.track}</p>
              </div>
            )}
            {grant.max_applications && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground/50 mb-0.5">名额上限</p>
                <p className="font-medium text-foreground">{grant.max_applications}</p>
              </div>
            )}
            {grant.required_skills && Array.isArray(grant.required_skills) && grant.required_skills.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-muted-foreground/50 mb-1">Required Skills</p>
                <div className="flex flex-wrap gap-1">
                  {grant.required_skills.map((s: string) => (
                    <span key={s} className="px-2 py-0.5 bg-background border border-border rounded text-xs text-muted-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {grant.tech_requirements && (
              <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-muted-foreground/50 mb-0.5">技术要求</p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{grant.tech_requirements}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-border">
            {grant.source_type === 'external' && grant.external_url && (
              <a href={grant.external_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/80 text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors">
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


