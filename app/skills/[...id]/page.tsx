import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import { serviceClient } from '@/lib/supabase'
import type { Skill } from '@/lib/types'
import { Navbar } from '@/components/navbar'
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
  official:       { label: '🏛️ Official',  className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900' },
  verified:       { label: '✅ Verified',   className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900' },
  community:      { label: '👥 Community',  className: 'bg-muted text-muted-foreground border-border' },
  'ai-generated': { label: '🤖 AI Draft',  className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900' },
}

const badgeBase = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize'

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string[] }>
}) {
  const { id } = await params
  const skillId = id.join('/')

  const { data, error } = await serviceClient
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single()

  if (error || !data) {
    notFound()
  }

  const skill = data as Skill
  const installCmd = (skill.source === 'official' && skill.source_repo &&
    (skill.source_repo.endsWith('.md') || skill.source_repo.includes('raw.githubusercontent')))
    ? skill.source_repo
    : `https://agentrel.vercel.app/api/skills/${skill.id}.md`

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href="/skills" className="hover:text-foreground transition-colors">Skills</Link>
          <span>/</span>
          <span className="font-mono text-foreground">{skill.id}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content — 2/3 */}
          <main className="min-w-0 lg:col-span-2">
            {/* Header */}
            <div className="mb-8 border-b border-border pb-6">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {skill.name}
              </h1>

              {/* Primary badges: type / ecosystem / source / confidence / health */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`${badgeBase} ${ecosystemClass(skill.ecosystem)}`}>
                  {skill.ecosystem}
                </span>
                <span className={`${badgeBase} border-border bg-muted/50 text-muted-foreground`}>
                  {skill.type}
                </span>
                {SOURCE_BADGE[skill.source] ? (
                  <span className={`${badgeBase} ${SOURCE_BADGE[skill.source].className}`}>
                    {SOURCE_BADGE[skill.source].label}
                  </span>
                ) : (
                  <span className={`${badgeBase} border-border bg-muted text-muted-foreground`}>
                    {skill.source}
                  </span>
                )}
                {skill.confidence && (
                  <span className={`${badgeBase} border-border bg-muted/50 text-muted-foreground normal-case`}>
                    confidence {skill.confidence}
                  </span>
                )}
                {skill.health_score != null && (
                  <span className={`${badgeBase} normal-case ${healthClass(skill.health_score)}`}>
                    health {skill.health_score}%
                  </span>
                )}
              </div>

              {/* Secondary meta: version / maintainer / updated */}
              {(skill.version || skill.maintainer || skill.updated_at) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {skill.version && <span className="font-mono">v{skill.version}</span>}
                  {skill.version && (skill.maintainer || skill.updated_at) && <span className="opacity-40">·</span>}
                  {skill.maintainer && <span>by {skill.maintainer}</span>}
                  {skill.maintainer && skill.updated_at && <span className="opacity-40">·</span>}
                  {skill.updated_at && (
                    <span>Updated {new Date(skill.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>

            {/* Markdown content */}
            <article
              className={[
                'prose prose-sm max-w-none dark:prose-invert',
                // headings
                '[&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:pb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:border-b [&_h1]:border-border',
                '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:border-b [&_h2]:border-border',
                '[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold',
                '[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold',
                '[&_:is(h1,h2,h3,h4)]:scroll-mt-24',
                // paragraph + lists
                '[&_p]:leading-7',
                '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul_li]:my-1',
                '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol_li]:my-1',
                '[&_li_p]:my-0',
                // links
                '[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline',
                // inline code
                '[&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:text-[0.85em] [&_code:not(pre_code)]:font-mono [&_code:not(pre_code)]:text-foreground',
                // code blocks — border + rounded; hljs provides bg/colors
                '[&_pre]:my-5 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:overflow-x-auto [&_pre]:text-[13px] [&_pre]:leading-6',
                '[&_pre_code]:!bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono',
                // blockquote
                '[&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-muted/30 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-muted-foreground [&_blockquote]:italic',
                // tables
                '[&_table]:my-5 [&_table]:w-full [&_table]:block [&_table]:overflow-x-auto [&_table]:text-sm [&_table]:border-collapse',
                '[&_thead]:bg-muted/50',
                '[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
                '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
                // hr
                '[&_hr]:my-8 [&_hr]:border-border',
                // images
                '[&_img]:my-5 [&_img]:rounded-lg [&_img]:border [&_img]:border-border',
              ].join(' ')}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
              >
                {skill.content}
              </ReactMarkdown>
            </article>
          </main>

          {/* Sidebar — 1/3, sticky */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8 space-y-3">
              {/* Usage */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Usage</h3>
                <div className="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <code className="block font-mono text-[11px] leading-relaxed text-foreground break-all">
                    {installCmd}
                  </code>
                </div>
                <CopyButton text={installCmd} skillId={skill.id} />
              </div>

              {/* Raw */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Raw</h3>
                <a
                  href={`https://agentrel.vercel.app/api/skills/${skill.id}.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-lg border border-border px-3 py-2 text-center text-xs font-mono text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  curl …/{skill.id}.md
                </a>
              </div>

              {/* Details */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Details</h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted-foreground">ID</dt>
                    <dd className="font-mono text-[11px] text-right break-all">{skill.id}</dd>
                  </div>
                  {skill.version && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Version</dt>
                      <dd className="font-mono">{skill.version}</dd>
                    </div>
                  )}
                  {skill.time_sensitivity && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Sensitivity</dt>
                      <dd>{skill.time_sensitivity}</dd>
                    </div>
                  )}
                  {skill.tags && skill.tags.length > 0 && (
                    <div className="pt-1">
                      <dt className="mb-1.5 text-muted-foreground">Tags</dt>
                      <dd className="flex flex-wrap gap-1">
                        {skill.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-foreground/80">
                            {tag}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Feedback */}
              <FeedbackForm skillId={skill.id} />

              {/* Contribute */}
              <div className="rounded-xl border border-dashed border-border p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contribute</p>
                <div className="flex flex-col gap-2">
                  <a
                    href={`https://github.com/jueduizone/agentrel/issues/new?title=Fix+request:+${encodeURIComponent(skill.id)}&body=**Skill:**+${encodeURIComponent(skill.id)}%0A%0A**Issue:**%0A%0A**Suggested+fix:**`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    🐛 Report an error
                  </a>
                  <a
                    href={`https://github.com/jueduizone/agentrel/tree/main/skills`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    ✏️ Improve this skill
                  </a>
                  <a
                    href="https://github.com/jueduizone/agentrel/blob/main/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    📖 Contribution guide
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
