import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import { serviceClient } from '@/lib/supabase'
import type { Skill } from '@/lib/types'
import { Navbar } from '@/components/navbar'
import { cleanSkillName, normalizeSkillSource, stripFrontmatter, stripLeadingH1 } from '@/lib/utils'
import { FeedbackForm } from './FeedbackForm'
import { CopyButton } from './CopyButton'

function healthClass(score: number) {
  if (score >= 85) return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-900'
  if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/40 dark:border-yellow-900'
  return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-900'
}

function ecosystemClass(eco: string) {
  const map: Record<string, string> = {
    solana: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
    ethereum: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    aptos: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900',
    sui: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    ton: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
    cosmos: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
    polkadot: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900',
  }
  return map[eco.toLowerCase()] ?? 'bg-muted text-foreground/80 border-border'
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  official:       { label: '🏛️ Official',     className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900' },
  verified:       { label: '✅ Verified',      className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900' },
  community:      { label: '👥 Community',     className: 'bg-muted text-muted-foreground border-border' },
  'ai-generated': { label: '🤖 Auto-generated', className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900' },
}

const badgeBase = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize'

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string[] }>
}) {
  const { id } = await params
  const skillId = id.join('/')

  if (skillId === 'ethereum/ethskills-defi') {
    redirect('/skills/ethereum/ethskills-building-blocks')
  }

  const { data, error } = await serviceClient
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single()

  if (error || !data) {
    notFound()
  }

  const skill = data as Skill
  if ((skill.health_score ?? 0) < 0) {
    notFound()
  }

  const installCmd = (skill.source === 'official' && skill.source_repo &&
    (skill.source_repo.endsWith('.md') || skill.source_repo.includes('raw.githubusercontent')))
    ? skill.source_repo
    : `https://agentrel.vercel.app/api/skills/${skill.id}.md`

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
          <span className="opacity-40">/</span>
          <Link href="/skills" className="transition-colors hover:text-foreground">Skills</Link>
          <span className="opacity-40">/</span>
          <span className="truncate font-mono text-foreground">{skill.id}</span>
        </nav>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Main content — 2/3 */}
          <main className="min-w-0 lg:col-span-2">
            <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {/* Header */}
              <header className="border-b border-border px-6 py-6 sm:px-8 sm:py-7">
                <div className="mb-3 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="truncate">{skill.id}</span>
                </div>

                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-[2.25rem] sm:leading-[1.15]">
                  {cleanSkillName(skill.name)}
                </h1>

                {/* Primary badges */}
                <div className="mt-5 flex flex-wrap items-center gap-1.5">
                  <span className={`${badgeBase} ${ecosystemClass(skill.ecosystem)}`}>
                    {skill.ecosystem}
                  </span>
                  <span className={`${badgeBase} border-border bg-muted/60 text-muted-foreground`}>
                    {skill.type}
                  </span>
                  {(() => {
                    const normSrc = normalizeSkillSource(skill.source)
                    const cfg = SOURCE_BADGE[normSrc] ?? SOURCE_BADGE.community
                    return (
                      <span className={`${badgeBase} ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    )
                  })()}
                  {skill.confidence && (
                    <span className={`${badgeBase} border-border bg-muted/60 text-muted-foreground normal-case`}>
                      confidence {skill.confidence}
                    </span>
                  )}
                  {skill.health_score != null && (
                    <span className={`${badgeBase} normal-case ${healthClass(skill.health_score)}`}>
                      health {Math.max(0, skill.health_score)}%
                    </span>
                  )}
                </div>

                {/* Secondary meta */}
                {(skill.version || skill.maintainer || skill.updated_at) && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {skill.version && <span className="font-mono">v{skill.version}</span>}
                    {skill.version && (skill.maintainer || skill.updated_at) && <span className="opacity-40">·</span>}
                    {skill.maintainer && <span>by {skill.maintainer}</span>}
                    {skill.maintainer && skill.updated_at && <span className="opacity-40">·</span>}
                    {skill.updated_at && (
                      <span>Updated {new Date(skill.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                )}
              </header>

              {/* Markdown body */}
              <div className="skill-prose px-6 py-7 sm:px-8 sm:py-9">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
                  components={{
                    table: ({ children }) => (
                      <div className="table-wrapper">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {stripLeadingH1(stripFrontmatter(skill.content))}
                </ReactMarkdown>
              </div>
            </article>
          </main>

          {/* Sidebar — 1/3, sticky */}
          <aside className="min-w-0 lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              {/* Install / Usage */}
              <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-2.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Install
                  </h3>
                </div>
                <div className="space-y-2.5 p-4">
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <code className="block break-all font-mono text-[11px] leading-relaxed text-foreground">
                      {installCmd}
                    </code>
                  </div>
                  <CopyButton text={installCmd} skillId={skill.id} />
                  <a
                    href={installCmd}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-lg border border-border px-3 py-2 text-center font-mono text-xs text-muted-foreground transition-colors hover:border-foreground hover:bg-muted/40 hover:text-foreground"
                  >
                    View raw .md
                  </a>
                </div>
              </section>

              {/* Details */}
              <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-2.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Details
                  </h3>
                </div>
                <dl className="divide-y divide-border text-xs">
                  <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <dt className="text-muted-foreground">ID</dt>
                    <dd className="break-all text-right font-mono text-[11px] text-foreground">{skill.id}</dd>
                  </div>
                  {skill.version && (
                    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <dt className="text-muted-foreground">Version</dt>
                      <dd className="font-mono text-foreground">{skill.version}</dd>
                    </div>
                  )}
                  {skill.time_sensitivity && (
                    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <dt className="text-muted-foreground">Sensitivity</dt>
                      <dd className="text-foreground">{skill.time_sensitivity}</dd>
                    </div>
                  )}
                  {skill.tags && skill.tags.length > 0 && (
                    <div className="px-4 py-3">
                      <dt className="mb-2 text-muted-foreground">Tags</dt>
                      <dd className="flex flex-wrap gap-1">
                        {skill.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-foreground/80">
                            {tag}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Feedback */}
              <FeedbackForm skillId={skill.id} />

              {/* Contribute */}
              <section className="overflow-hidden rounded-xl border border-dashed border-border bg-card/50">
                <div className="border-b border-dashed border-border px-4 py-2.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contribute
                  </h3>
                </div>
                <div className="flex flex-col gap-1.5 p-3">
                  <a
                    href={`https://github.com/jueduizone/agentrel/issues/new?title=Fix+request:+${encodeURIComponent(skill.id)}&body=**Skill:**+${encodeURIComponent(skill.id)}%0A%0A**Issue:**%0A%0A**Suggested+fix:**`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <span>🐛</span>
                    <span>Report an error</span>
                  </a>
                  <a
                    href={`https://github.com/jueduizone/agentrel/tree/main/skills`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <span>✏️</span>
                    <span>Improve this skill</span>
                  </a>
                  <a
                    href="https://github.com/jueduizone/agentrel/blob/main/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <span>📖</span>
                    <span>Contribution guide</span>
                  </a>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
