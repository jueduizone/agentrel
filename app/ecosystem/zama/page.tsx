'use client'

import { SourceBadge } from '@/components/SourceBadge'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Navbar } from '@/components/navbar'
import { CopySkillUrlButton } from './CopySkillUrlButton'
import { useLang } from '@/context/LanguageContext'
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
  community: { label: '👥 Community', className: 'bg-muted text-muted-foreground border border-border' },
  'ai-generated': { label: '🤖 AI Draft', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
}
export default function ZamaEcosystemPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const { lang } = useLang()
  useEffect(() => {
    browserClient
      .from('skills')
      .select('*')
      .eq('ecosystem', 'zama')
      .order('created_at', { ascending: true })
      .then(({ data }) => setSkills(data ?? []))
  }, [])
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
          <span className="text-foreground font-medium">Zama</span>
        </nav>
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/logos/zama.webp"
              alt="Zama"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <h1 className="text-3xl font-bold text-foreground">Zama</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Zama is an open source cryptography company building cutting-edge FHE solutions for blockchain and AI. Their fhEVM library enables confidential smart contracts on Ethereum — computations on encrypted data without ever decrypting on-chain.
          </p>
          {/* Social links */}
          <div className="mt-4 flex items-center gap-4 text-sm">
            <a href="https://zama.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              zama.org
            </a>
            <a href="https://github.com/zama-ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              zama-ai
            </a>
            <a href="https://twitter.com/zama_fhe" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.751-8.867L1.547 2.25h7.019l4.262 5.611L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @zama_fhe
            </a>
          </div>
          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { label: 'Technology', value: 'FHE (TFHE scheme)' },
              { label: 'Language', value: 'Solidity' },
              { label: 'Network', value: 'Ethereum / Sepolia' },
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
          <h3 className="mb-1 font-medium text-foreground">Using these skills</h3>
          <p className="text-sm text-muted-foreground">
            Copy a Skill URL and fetch it from your AI agent to provide accurate, up-to-date context
            for building on Zama. Skills are maintained by{' '}
            <a
              href="https://zama.org"
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