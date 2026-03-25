'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Navbar } from '@/components/navbar'
import { CopySkillUrlButton } from './CopySkillUrlButton'

const browserClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Skill {
  id: string
  name: string
  name_zh?: string | null
  ecosystem: string
  type: string
  source: string
  confidence: string
  version: string
  tags: string[]
  content: string
  description_zh?: string | null
}

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

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  official: { label: '🏛️ Official', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  verified: { label: '✅ Verified', className: 'bg-green-100 text-green-700 border border-green-200' },
  community: { label: '👥 Community', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  'ai-generated': { label: '🤖 AI Draft', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
}

export default function ZamaEcosystemPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [lang, setLang] = useState<'en' | 'zh'>('en')

  useEffect(() => {
    browserClient
      .from('skills')
      .select('*')
      .eq('ecosystem', 'Zama')
      .order('created_at', { ascending: true })
      .then(({ data }) => setSkills(data ?? []))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb + Language Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/ecosystem" className="hover:text-foreground transition-colors">
              Ecosystems
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Zama</span>
          </nav>

          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setLang('en')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                lang === 'en'
                  ? 'bg-black text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('zh')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                lang === 'zh'
                  ? 'bg-black text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              中文
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-lg font-bold text-red-700">
              Z
            </div>
            <h1 className="text-3xl font-bold text-black">Zama</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Zama brings Fully Homomorphic Encryption (FHE) to the EVM. Use these skills to give AI agents accurate context for building confidential smart contracts with fhEVM.
          </p>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { label: 'Technology', value: 'FHE' },
              { label: 'Language', value: 'Solidity' },
              { label: 'Privacy', value: 'On-chain' },
              { label: 'Framework', value: 'fhEVM' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border px-4 py-3 text-center min-w-[100px]"
              >
                <div className="text-lg font-bold text-black">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">
            Skills{' '}
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-sm font-normal text-muted-foreground">
              {skills.length}
            </span>
          </h2>
          <Link
            href="/skills?ecosystem=Zama"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all skills →
          </Link>
        </div>

        {skills.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center text-muted-foreground">
            No skills found for Zama.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => {
              const skillUrl = extractSkillUrl(skill.content)
              const description = lang === 'zh' && skill.description_zh
                ? skill.description_zh
                : getDescription(skill.content)
              const displayName = lang === 'zh' && skill.name_zh ? skill.name_zh : skill.name
              const sourceBadge = SOURCE_BADGE[skill.source]

              return (
                <div
                  key={skill.id}
                  className="flex flex-col rounded-xl border border-border p-4 transition-colors hover:border-red-200 hover:bg-red-50/30"
                >
                  {/* ID + source */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground truncate">
                      {skill.id}
                    </span>
                    {sourceBadge ? (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${sourceBadge.className}`}>
                        {sourceBadge.label}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {skill.source}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <Link href={`/skills/${skill.id}`}>
                    <h3 className="mb-2 font-medium text-black hover:text-red-700 transition-colors">
                      {displayName}
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
          <h3 className="mb-1 font-medium text-black">Using these skills</h3>
          <p className="text-sm text-muted-foreground">
            Copy a Skill URL and fetch it from your AI agent to provide accurate, up-to-date context
            for building on Zama. Skills are maintained by{' '}
            <a
              href="https://zama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline underline-offset-2"
            >
              Zama
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
