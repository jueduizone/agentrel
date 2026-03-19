import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { serviceClient } from '@/lib/supabase'
import type { Skill } from '@/lib/types'
import { Navbar } from '@/components/navbar'
import { FeedbackForm } from './FeedbackForm'
import { CopyButton } from './CopyButton'

function ecosystemClass(eco: string) {
  const map: Record<string, string> = {
    solana: 'bg-purple-100 text-purple-700 border-purple-200',
    ethereum: 'bg-blue-100 text-blue-700 border-blue-200',
    aptos: 'bg-teal-100 text-teal-700 border-teal-200',
    sui: 'bg-sky-100 text-sky-700 border-sky-200',
    ton: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    cosmos: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    polkadot: 'bg-pink-100 text-pink-700 border-pink-200',
  }
  return map[eco.toLowerCase()] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  official:       { label: '🏛️ Official',  className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  verified:       { label: '✅ Verified',   className: 'bg-green-100 text-green-700 border border-green-200' },
  community:      { label: '👥 Community',  className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  'ai-generated': { label: '🤖 AI Draft',  className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
}

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
  const installCmd = `npx skills add agentrel/${skill.id}`

  return (
    <div className="min-h-screen bg-white">
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

        <div className="flex gap-8">
          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${ecosystemClass(skill.ecosystem)}`}>
                  {skill.ecosystem}
                </span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {skill.type}
                </span>
                {skill.confidence && (
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                    confidence: {skill.confidence}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-black">{skill.name}</h1>
              <div className="mt-2">
                {SOURCE_BADGE[skill.source] ? (
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SOURCE_BADGE[skill.source].className}`}>
                    {SOURCE_BADGE[skill.source].label}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {skill.source}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {skill.version && <span>v{skill.version}</span>}
                {skill.maintainer && <span>by {skill.maintainer}</span>}
                {skill.updated_at && (
                  <span>Updated {new Date(skill.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Markdown content */}
            <div className="prose prose-sm max-w-none [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/50 [&_pre]:p-4 [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:text-sm [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-medium [&_a]:text-blue-600 [&_a:hover]:underline [&_table]:text-sm [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {skill.content}
              </ReactMarkdown>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="w-72 shrink-0">
            <div className="sticky top-20 space-y-4">
              {/* Install */}
              <div className="rounded-xl border border-border p-4">
                <h3 className="mb-3 font-medium text-black">Install</h3>
                <div className="mb-2 rounded-lg border border-border bg-muted/30 p-3">
                  <code className="block font-mono text-xs text-foreground break-all">
                    {installCmd}
                  </code>
                </div>
                <CopyButton text={installCmd} />
              </div>

              {/* Raw */}
              <div className="rounded-xl border border-border p-4">
                <h3 className="mb-3 font-medium text-black">Raw</h3>
                <a
                  href={`/api/skills/${skill.id}?format=raw`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-black hover:text-foreground"
                >
                  curl /api/skills/{skill.id}?format=raw
                </a>
              </div>

              {/* Meta */}
              <div className="rounded-xl border border-border p-4">
                <h3 className="mb-3 font-medium text-black">Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">ID</dt>
                    <dd className="font-mono text-xs">{skill.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Version</dt>
                    <dd>{skill.version}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sensitivity</dt>
                    <dd>{skill.time_sensitivity}</dd>
                  </div>
                  {skill.tags && skill.tags.length > 0 && (
                    <div>
                      <dt className="mb-1 text-muted-foreground">Tags</dt>
                      <dd className="flex flex-wrap gap-1">
                        {skill.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-border px-1.5 py-0.5 text-xs">
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
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
