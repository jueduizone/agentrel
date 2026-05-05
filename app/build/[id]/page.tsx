import { serviceClient } from '@/lib/supabase'
import { siteUrl } from '@/lib/site-url'
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
    <section className="group rounded-2xl border border-border bg-card/60 p-6 shadow-[0_1px_0_0_rgb(0_0_0/0.02)] backdrop-blur-sm transition-colors hover:border-foreground/15">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 text-sm leading-6 text-foreground/85">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3">
          <span
            aria-hidden
            className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70 ring-2 ring-primary/15"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function SkillTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground/85 transition-colors hover:border-primary/40 hover:bg-muted">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary/60" />
      {label}
    </span>
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
    grant.source_type === 'external' && grant.external_url ? { label: 'View Source', href: grant.external_url } : null,
    sponsorUrl ? { label: `${sponsorName ?? 'Sponsor'} website`, href: sponsorUrl } : null,
    isZama ? { label: 'Zama Docs', href: 'https://docs.zama.ai/' } : null,
    isZama ? { label: 'Zama Bounty', href: 'https://bounty.zama.ai/' } : null,
    isZama ? { label: 'Zama Protocol Litepaper', href: 'https://docs.zama.org/protocol/zama-protocol-litepaper' } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>

  const isLive = isOpen && !isPast

  return (
    <div className="relative min-h-screen bg-background">
      {/* Ambient gradient mesh — subtle, theme-aware via primary token */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px]"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent) 0%, transparent 70%)',
        }}
      />
      <Navbar />
      <main className="relative mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/build"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>←</span>
          <span>Back to Build</span>
        </Link>

        {/* Hero */}
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          {/* Top accent line */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          />

          <div className="grid gap-8 p-8 md:grid-cols-[1fr_280px]">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {grant.source_type === 'external' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    External Bounty
                  </span>
                )}
                {grant.source_type === 'native' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Native Grant
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    isLive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-muted-foreground/60'}`}
                  />
                  {isLive ? 'Open' : 'Closed'}
                </span>
                {grant.track && (
                  <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {grant.track}
                  </span>
                )}
              </div>

              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {grant.title}
              </h1>
              {grant.description && (
                <p className="max-w-2xl whitespace-pre-wrap text-base leading-7 text-muted-foreground">
                  {grant.description}
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                {grant.source_type === 'external' && grant.external_url && (
                  <a
                    href={grant.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]"
                  >
                    <span aria-hidden>↗</span>
                    View Source
                  </a>
                )}
                <a
                  href={siteUrl(`/api/v1/grants/${id}/context.md`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-foreground/30 hover:bg-muted/60"
                >
                  <span aria-hidden>🤖</span>
                  Agent Context
                </a>
              </div>
            </div>

            {/* Hero summary */}
            <aside className="rounded-2xl border border-border bg-muted/40 p-5 dark:bg-muted/30">
              {grant.reward && (
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Reward
                  </p>
                  <p className="mt-1.5 bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-2xl font-bold leading-tight text-transparent dark:from-primary dark:to-fuchsia-400">
                    {grant.reward}
                  </p>
                </div>
              )}
              {deadlineIso && (
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Deadline
                  </p>
                  <p
                    className={`mt-1.5 font-semibold ${isPast ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}
                    suppressHydrationWarning
                  >
                    {formatDateLong(deadlineIso)}
                  </p>
                </div>
              )}
              {sponsorName && (
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Sponsor
                  </p>
                  <div className="mt-2 flex items-center gap-2 font-semibold text-foreground">
                    {grant.sponsors?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={grant.sponsors.logo_url}
                        alt={sponsorName}
                        className="h-6 w-6 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-xs">
                        🏢
                      </span>
                    )}
                    {sponsorUrl ? (
                      <a
                        href={sponsorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {sponsorName}
                      </a>
                    ) : (
                      <span>{sponsorName}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{grant.application_count}</span>
                <span>applied</span>
                {grant.track && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{grant.track}</span>
                  </>
                )}
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
                    <SkillTag key={s} label={s} />
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
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/85">
                    {grant.tech_requirements}
                  </p>
                )}
              </SectionCard>
            )}

            <SectionCard title="Judging Criteria">
              <BulletList
                items={
                  requirementSections.judgingCriteria.length > 0
                    ? requirementSections.judgingCriteria
                    : [
                        'Technical fit with the listed ecosystem and requirements.',
                        'Clear implementation plan, working demo, and verifiable repository.',
                        'Scope that can be reviewed and shipped before the deadline.',
                      ]
                }
              />
            </SectionCard>

            {requirementSections.exampleIdeas.length > 0 && (
              <SectionCard title="Example Project Ideas">
                <div className="flex flex-wrap gap-2">
                  {requirementSections.exampleIdeas.map((idea) => (
                    <SkillTag key={idea} label={idea} />
                  ))}
                </div>
              </SectionCard>
            )}

            {resourceLinks.length > 0 && (
              <SectionCard title="Resources">
                <div className="grid gap-2 sm:grid-cols-2">
                  {resourceLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link flex items-center justify-between gap-2 rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-muted/60"
                    >
                      <span className="truncate">{link.label}</span>
                      <span
                        aria-hidden
                        className="text-muted-foreground transition-transform group-hover/link:translate-x-0.5 group-hover/link:text-foreground"
                      >
                        ↗
                      </span>
                    </a>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          <aside>
            <div className="md:sticky md:top-6">
              <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-5 shadow-sm">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
                />
                <div className="relative">
                  <div className="mb-1 flex items-center gap-2">
                    <span aria-hidden className="text-base">🤖</span>
                    <h2 className="text-base font-bold text-foreground">Agent Apply Box</h2>
                  </div>
                  <p className="mb-4 text-sm leading-6 text-muted-foreground">
                    复制 context.md 给 coding agent，让它基于 bounty 要求和生态 skill 生成申请方案。
                  </p>
                  <ApplyCTA grantId={id} isOpen={isLive} />
                </div>
              </section>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
