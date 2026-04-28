import { serviceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { ApplyCTA } from './ApplyCTA'
import { extractGrantRequirementSections } from '@/lib/grantContextHelpers'

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
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
  const grantRecord = { ...(grant as Record<string, unknown> & typeof grant) }
  delete grantRecord.sponsors
  return { ...grantRecord, sponsors, application_count: count ?? 0 }
}

function hasSkill(grant: Record<string, unknown>, skill: string) {
  return Array.isArray(grant.required_skills) && grant.required_skills.some((s) => String(s).toLowerCase() === skill)
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-foreground/80">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function GrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const grant = await getGrant(id)
  if (!grant) notFound()

  const isOpen = grant.status === 'open'
  const deadlineIso: string | null = grant.deadline ?? null
  const isPast = deadlineIso ? new Date(deadlineIso) < new Date() : false
  const requirementSections = extractGrantRequirementSections(grant.tech_requirements)
  const isZama = hasSkill(grant, 'zama')
  const sponsorName = grant.sponsors?.name ?? grant.sponsor
  const sponsorUrl = grant.sponsors?.website_url
  const resourceLinks = [
    grant.source_type === 'external' && grant.external_url ? { label: '查看原网站', href: grant.external_url } : null,
    sponsorUrl ? { label: `${sponsorName ?? 'Sponsor'} website`, href: sponsorUrl } : null,
    isZama ? { label: 'Zama Docs', href: 'https://docs.zama.ai/' } : null,
    isZama ? { label: 'Zama Bounty', href: 'https://bounty.zama.ai/' } : null,
    isZama ? { label: 'fhEVM Litepaper', href: 'https://www.zama.ai/post/introducing-fhevm' } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/build" className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">← Build</Link>

        <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
          <div className="grid gap-6 p-8 md:grid-cols-[1fr_280px]">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {grant.source_type === 'external' && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">External Bounty</span>
                )}
                {grant.source_type === 'native' && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">Native Grant</span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isOpen && !isPast ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  {isOpen && !isPast ? 'Open' : 'Closed'}
                </span>
              </div>

              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">{grant.title}</h1>
              {grant.description && (
                <p className="max-w-2xl whitespace-pre-wrap text-base leading-7 text-muted-foreground">{grant.description}</p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {grant.source_type === 'external' && grant.external_url && (
                  <a href={grant.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90">
                    🔗 查看原网站
                  </a>
                )}
                <a href={`https://agentrel.vercel.app/api/v1/grants/${id}/context.md`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/60">
                  🤖 Agent Context
                </a>
              </div>
            </div>

            <aside className="rounded-2xl border border-border bg-muted/30 p-5">
              {grant.reward && (
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Reward</p>
                  <p className="mt-1 text-2xl font-bold text-indigo-700">{grant.reward}</p>
                </div>
              )}
              {deadlineIso && (
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Deadline</p>
                  <p className={`mt-1 font-semibold ${isPast ? 'text-red-500' : 'text-foreground'}`} suppressHydrationWarning>
                    {formatDateLong(deadlineIso)}
                  </p>
                </div>
              )}
              {sponsorName && (
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Sponsor</p>
                  <div className="mt-2 flex items-center gap-2 font-semibold text-foreground">
                    {grant.sponsors?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={grant.sponsors.logo_url} alt={sponsorName} className="h-6 w-6 rounded-full object-cover" />
                    ) : <span>🏢</span>}
                    {sponsorUrl ? <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{sponsorName}</a> : <span>{sponsorName}</span>}
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <span>{grant.application_count} applied</span>
                {grant.track && <span> · {grant.track}</span>}
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {grant.required_skills && Array.isArray(grant.required_skills) && grant.required_skills.length > 0 && (
              <SectionCard title="Required Skills">
                <div className="flex flex-wrap gap-2">
                  {grant.required_skills.map((s: string) => (
                    <span key={s} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-sm text-foreground">{s}</span>
                  ))}
                </div>
              </SectionCard>
            )}

            {grant.tech_requirements && (
              <SectionCard title="Submission Requirements">
                {requirementSections.submissionRequirements.length > 0 ? (
                  <BulletList items={requirementSections.submissionRequirements} />
                ) : requirementSections.other.length > 0 ? (
                  <BulletList items={requirementSections.other} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/80">{grant.tech_requirements}</p>
                )}
              </SectionCard>
            )}

            <SectionCard title="Judging Criteria">
              <BulletList items={requirementSections.judgingCriteria.length > 0 ? requirementSections.judgingCriteria : [
                'Technical fit with the listed ecosystem and requirements.',
                'Clear implementation plan, working demo, and verifiable repository.',
                'Scope that can be reviewed and shipped before the deadline.',
              ]} />
            </SectionCard>

            {requirementSections.exampleIdeas.length > 0 && (
              <SectionCard title="Example Project Ideas">
                <div className="flex flex-wrap gap-2">
                  {requirementSections.exampleIdeas.map((idea) => (
                    <span key={idea} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-sm text-foreground">{idea}</span>
                  ))}
                </div>
              </SectionCard>
            )}

            {resourceLinks.length > 0 && (
              <SectionCard title="Resources">
                <div className="grid gap-2 sm:grid-cols-2">
                  {resourceLinks.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/60">
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
              <h2 className="mb-2 text-base font-bold text-indigo-950">Agent Apply Box</h2>
              <p className="mb-4 text-sm leading-6 text-indigo-900/80">
                复制 context.md 给 coding agent，让它基于 bounty 要求和生态 skill 生成申请方案。
              </p>
              <ApplyCTA grantId={id} isOpen={isOpen && !isPast} />
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
