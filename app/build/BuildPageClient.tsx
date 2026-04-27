'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { Navbar } from '@/components/navbar'
import { useLang } from '@/context/LanguageContext'
import { BuildTabs } from './BuildClient'

type StatusFilter = 'open' | 'closed' | 'all'

type Grant = {
  id: string
  title: string
  description: string | null
  sponsor: string | null
  sponsor_id: string | null
  sponsors: { name: string; logo_url: string | null; website_url: string | null } | null
  reward: string | null
  deadline: string | null
  status: string
  source_type?: string
  track?: string | null
  application_count: number
}

type Props = {
  allGrants: Grant[]
  displayed: Grant[]
  openCount: number
  closedCount: number
  filter: StatusFilter
}

const GRANT_TITLE_ZH: Record<string, string> = {
  'Build a Web3 AI Agent': '构建 Web3 AI Agent',
  'Build a Web3 AI Agent with AgentRel': '用 AgentRel 构建 Web3 AI Agent',
}

const GRANT_DESC_ZH: Record<string, string> = {
  'Build a Web3 AI Agent that can reason about blockchain ecosystems using AgentRel Skills.':
    '使用 AgentRel Skills 构建能够理解区块链生态的 Web3 AI Agent。',
  'Build a Web3 AI Agent that integrates with AgentRel Skills. Submit a working demo with GitHub repo.':
    '构建一个集成 AgentRel Skills 的 Web3 AI Agent，并提交可运行 Demo 与 GitHub 仓库。',
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function localizedGrantTitle(title: string, lang: string) {
  if (lang !== 'zh') return title
  return GRANT_TITLE_ZH[normalizeText(title)] ?? title
}

function localizedGrantDescription(description: string | null, lang: string) {
  if (!description || lang !== 'zh') return description
  return GRANT_DESC_ZH[normalizeText(description)] ?? description
}

function formatDateShort(iso: string, lang: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function BuildPageClient({ allGrants, displayed, openCount, closedCount, filter }: Props) {
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-muted/50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('grants.title')}</h1>
          <p className="text-sm text-muted-foreground/70 mt-1">{t('grants.desc')}</p>
        </div>

        <Suspense fallback={null}>
          <BuildTabs
            total={allGrants.length}
            openCount={openCount}
            closedCount={closedCount}
            current={filter}
          />
        </Suspense>

        {displayed.length === 0 && (
          <p className="text-center text-muted-foreground/50 py-16">
            {filter === 'open' ? t('grants.emptyOpen') : filter === 'closed' ? t('grants.emptyClosed') : t('grants.emptyAll')}
          </p>
        )}

        <div className={`space-y-4 ${filter === 'closed' ? 'opacity-75' : ''}`}>
          {displayed.map(g => <GrantCard key={g.id} grant={g} />)}
        </div>
      </main>
    </div>
  )
}

function GrantCard({ grant }: { grant: Grant }) {
  const { lang, t } = useLang()
  const isOpen = grant.status === 'open'
  const deadlineIso = grant.deadline ?? null
  const isPast = deadlineIso ? new Date(deadlineIso) < new Date() : false
  const description = localizedGrantDescription(grant.description, lang)

  return (
    <Link href={`/build/${grant.id}`} className="block group">
      <div className="bg-background rounded-xl border border-border p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-base group-hover:text-indigo-700 transition-colors">
                {localizedGrantTitle(grant.title, lang)}
              </h3>
              {grant.source_type === 'external' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">{t('grants.sourceExternal')}</span>
              )}
              {grant.source_type === 'native' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{t('grants.sourceNative')}</span>
              )}
              {grant.track && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{grant.track}</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {grant.reward && <p className="font-bold text-indigo-700 text-sm">{grant.reward}</p>}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${isOpen && !isPast ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground/70'}`}>
              {isOpen && !isPast ? t('grants.statusOpen') : t('grants.statusClosed')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mb-2">
          {(grant.sponsors || grant.sponsor) ? (
            <span className="flex items-center gap-1 font-medium text-foreground/80">
              {grant.sponsors?.logo_url
                ? <img src={grant.sponsors.logo_url} alt={grant.sponsors.name} className="w-4 h-4 rounded-full object-cover" />
                : <span>🏢</span>}
              {grant.sponsors?.website_url
                ? <a href={grant.sponsors.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{grant.sponsors.name ?? grant.sponsor}</a>
                : <span>{grant.sponsors?.name ?? grant.sponsor}</span>}
            </span>
          ) : null}
          {(grant.sponsors || grant.sponsor) && deadlineIso && <span className="text-muted-foreground">·</span>}
          {deadlineIso && (
            <span className={isPast ? 'text-red-400' : ''} suppressHydrationWarning>
              {t('grants.deadline')}: {formatDateShort(deadlineIso, lang)}
            </span>
          )}
          {(grant.sponsor || deadlineIso) && <span className="text-muted-foreground">·</span>}
          <span>{t('grants.appliedCount').replace('{count}', String(grant.application_count))}</span>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground/70 line-clamp-2">{description}</p>
        )}
      </div>
    </Link>
  )
}
