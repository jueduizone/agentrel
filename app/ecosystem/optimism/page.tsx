import { SourceBadge } from '@/components/SourceBadge'
import Link from 'next/link'
import { serviceClient } from '@/lib/supabase'
import type { Skill } from '@/lib/types'
import { Navbar } from '@/components/navbar'
import { CopySkillUrlButton } from './CopySkillUrlButton'

function extractSkillUrl(content: string): string | null {
  const match = content.match(/Skill URL:\s*(https?:\/\/\S+)/)
  return match ? match[1] : null
}

function getDescription(content: string): string {
  const stripped = content
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/^#{1,6}\s.*/gm, '')
    .replace(/\*\*[^*]+\*\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
  const firstPara = stripped.split('\n\n').find((p) => p.trim().length > 20) ?? ''
  return firstPara.trim().slice(0, 120)
}

export default async function OptimismEcosystemPage() {
  const { data: skills } = await serviceClient
    .from('skills')
    .select('*')
    .eq('ecosystem', 'optimism')
    .order('created_at', { ascending: true })

  const ecosystemSkills: Skill[] = skills ?? []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/ecosystem" className="hover:text-foreground transition-colors">
            Ecosystems
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Optimism</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-lg font-bold text-red-700">
              O
            </div>
            <h1 className="text-3xl font-bold text-foreground">Optimism</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Ethereum L2 using Optimistic Rollup technology, powering the OP Stack that underlies Base, Mantle, and the Superchain vision. Use these skills to give AI agents accurate context when building on Optimism.
          </p>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { label: 'Stack', value: 'OP Stack' },
              { label: 'Compatibility', value: 'EVM' },
              { label: 'Layer', value: 'L2' },
              { label: 'Superchain', value: 'Yes' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border px-4 py-3 text-center min-w-[100px]"
              >
                <div className="text-lg font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Skills{' '}
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-sm font-normal text-muted-foreground">
              {ecosystemSkills.length}
            </span>
          </h2>
          <Link
            href="/skills?ecosystem=optimism"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all skills →
          </Link>
        </div>

        {ecosystemSkills.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center text-muted-foreground">
            No skills found for Optimism.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ecosystemSkills.map((skill) => {
              const skillUrl = extractSkillUrl(skill.content)
              const description = getDescription(skill.content)

              return (
                <div
                  key={skill.id}
                  className="flex flex-col rounded-xl border border-border p-4 transition-colors hover:border-border dark:hover:border-border/60 hover:bg-muted/50 dark:hover:bg-muted/30"
                >
                  {/* ID + source */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground truncate">
                      {skill.id}
                    </span>
                    <SourceBadge source={skill.source} />
                  </div>

                  {/* Name */}
                  <Link href={`/skills/${skill.id}`}>
                    <h3 className="mb-2 font-medium text-foreground hover:text-foreground transition-colors">
                      {skill.name}
                    </h3>
                  </Link>

                  {/* Description */}
                  <p className="mb-3 flex-1 text-xs text-muted-foreground line-clamp-3">
                    {description}
                  </p>

                  {/* Tags */}
                  {skill.tags?.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {skill.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Copy Skill URL */}
                  {skillUrl && <CopySkillUrlButton url={skillUrl} />}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-10 rounded-xl border border-border bg-muted/30 p-6">
          <h3 className="mb-1 font-medium text-foreground">Using these skills</h3>
          <p className="text-sm text-muted-foreground">
            Copy a Skill URL and fetch it from your AI agent to provide accurate, up-to-date context
            for building on Optimism. Skills are maintained by the AgentRel community.
          </p>
        </div>
      </div>
    </div>
  )
}
