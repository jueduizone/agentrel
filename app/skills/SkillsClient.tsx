'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Skill } from '@/lib/types'
import { useLang } from '@/context/LanguageContext'
import { sendGAEvent } from '@next/third-parties/google'

function healthClass(score: number) {
  if (score >= 85) return 'text-green-600 bg-green-50'
  if (score >= 60) return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  return `${months}个月前`
}

function formatInstallCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toString()
}

function ecosystemClass(eco: string) {
  const map: Record<string, string> = {
    monad:    'bg-purple-100 text-purple-700 border-purple-200',
    solana:   'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    ethereum: 'bg-blue-100 text-blue-700 border-blue-200',
    aptos:    'bg-teal-100 text-teal-700 border-teal-200',
    sui:      'bg-sky-100 text-sky-700 border-sky-200',
    arbitrum: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    base:     'bg-blue-50 text-blue-600 border-blue-100',
    optimism: 'bg-red-100 text-red-700 border-red-200',
    polygon:  'bg-violet-100 text-violet-700 border-violet-200',
    starknet: 'bg-orange-100 text-orange-700 border-orange-200',
    zksync:   'bg-muted text-foreground/80 border-border',
  }
  return map[eco.toLowerCase()] ?? 'bg-muted text-foreground/80 border-border'
}

type Props = {
  skills: Skill[]
  initialEcosystem?: string
  initialQ?: string
  initialType?: string
}

export function SkillsClient({ skills, initialEcosystem, initialQ, initialType }: Props) {
  const [search, setSearch] = useState(initialQ ?? '')
  const [selectedEcosystem, setSelectedEcosystem] = useState(initialEcosystem ?? 'all')
  const [selectedType, setSelectedType] = useState(initialType ?? 'all')
  const [selectedSource, setSelectedSource] = useState('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Skill[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { lang, t } = useLang()

  // 搜索建议（防抖 300ms，调 /api/skills/search）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (search.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skills/search?q=${encodeURIComponent(search)}&limit=5`)
        const json = await res.json()
        setSuggestions(json.data ?? [])
        setShowSuggestions(true)
      } catch { setSuggestions([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // 点击外部关闭建议
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Extract unique ecosystems from data, sorted by count (exclude 'agentrel' ecosystem)
  const ecosystems = useMemo(() => {
    const counts = skills.reduce<Record<string, number>>((acc, s) => {
      if (s.ecosystem === 'agentrel') return acc  // hide agentrel from filter
      acc[s.ecosystem] = (acc[s.ecosystem] ?? 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([eco]) => eco)
  }, [skills])

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      // Hide deprioritized skills (health_score=0) by default
      if (s.health_score === 0 && selectedSource !== 'all') return false
      // Grant auto-skills: only show when source=auto is selected
      if (s.id?.startsWith('grant-') && selectedSource !== 'ai-generated' && selectedSource !== 'all') return false
      if (selectedEcosystem !== 'all' && s.ecosystem !== selectedEcosystem) return false
      if (selectedType !== 'all' && s.type !== selectedType) return false
      if (selectedSource !== 'all' && s.source !== selectedSource) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.id.toLowerCase().includes(q) &&
          !(s.tags?.some((t) => t.toLowerCase().includes(q)))
        ) return false
      }
      return true
    })
  }, [skills, search, selectedEcosystem, selectedType, selectedSource])

  function getSkillUrl(skill: Skill): string {
    // Official skills: use source_repo direct URL if available (raw content)
    if (skill.source === 'official' && skill.source_repo) {
      // Convert GitHub repo URL to raw content URL if it's a GitHub repo
      const repo = skill.source_repo
      if (repo.includes('github.com') && !repo.includes('/blob/') && !repo.endsWith('.md')) {
        // It's a repo URL, not a direct file URL — fall back to our API
        return `https://agentrel.vercel.app/api/skills/${skill.id}.md`
      }
      // Direct file URL or raw URL — use it
      if (repo.endsWith('.md') || repo.includes('raw.githubusercontent')) {
        return repo
      }
    }
    return `https://agentrel.vercel.app/api/skills/${skill.id}.md`
  }

  async function handleCopy(e: React.MouseEvent, skill: Skill) {
    e.preventDefault()
    const url = getSkillUrl(skill)
    await navigator.clipboard.writeText(url)
    setCopiedId(skill.id)
    setTimeout(() => setCopiedId(null), 2000)
    sendGAEvent('event', 'skill_copy', { skill_id: skill.id, ecosystem: skill.ecosystem })
  }

  return (
    <div>
      {/* Search + Filter bar */}
      <div className="mb-6 space-y-3">
        <div ref={searchRef} className="relative w-full max-w-sm">
          <input
            type="search"
            placeholder={t('skills.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true) }}
            onFocus={() => search.length >= 2 && setShowSuggestions(true)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          {/* Search suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-10 left-0 z-50 w-full rounded-lg border border-border bg-background shadow-md">
              {suggestions.map((s) => (
                <Link
                  key={s.id}
                  href={`/skills/${s.id}`}
                  onClick={() => { setSearch(s.name); setShowSuggestions(false) }}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <span className="truncate text-foreground">{s.name}</span>
                  <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground capitalize">{s.ecosystem.charAt(0).toUpperCase() + s.ecosystem.slice(1)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedEcosystem('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedEcosystem === 'all'
                ? 'bg-black text-white'
                : 'border border-border bg-transparent text-muted-foreground hover:border-black hover:text-foreground'
            }`}
          >
            {t('skills.allSources')} ({skills.length})
          </button>
          {ecosystems.map((eco) => {
            const count = skills.filter((s) => s.ecosystem === eco).length
            return (
              <button
                key={eco}
                onClick={() => setSelectedEcosystem(eco === selectedEcosystem ? 'all' : eco)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  selectedEcosystem === eco
                    ? 'bg-black text-white'
                    : 'border border-border bg-transparent text-muted-foreground hover:border-black hover:text-foreground'
                }`}
              >
                {eco.charAt(0).toUpperCase() + eco.slice(1)} ({count})
              </button>
            )
          })}
        </div>

        {/* Type filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="self-center text-xs text-muted-foreground">{t('skills.typeFilter')}</span>
          {([
            { key: 'all', label: t('skills.allTypes') },
            { key: 'grant-guide', label: '💰 Grant / Bounty' },
            { key: 'technical-doc', label: '📖 Dev Guide' },
            { key: 'security', label: '🔒 Security' },
            { key: 'standards', label: '📐 Standards' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedType(key === 'all' ? 'all' : key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                (key === 'all' ? selectedType === 'all' : selectedType === key)
                  ? 'bg-black text-white'
                  : 'border border-border bg-transparent text-muted-foreground hover:border-black hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Source filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="self-center text-xs text-muted-foreground">{t('skills.sourceFilter')}</span>
          {(['all', 'official', 'community', 'ai-generated'] as const).map((src) => {
            const label = src === 'all'
              ? t('skills.allSources')
              : src === 'official' ? '🏛️ Official'
              : src === 'community' ? '👥 Community'
              : '🤖 AI Generated'
            return (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedSource === src
                    ? 'bg-black text-white'
                    : 'border border-border bg-transparent text-muted-foreground hover:border-black hover:text-foreground'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {filtered.length} skill{filtered.length !== 1 ? 's' : ''} · {t('skills.clickToCopy')}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center text-muted-foreground">
          {t('skills.noSkillsFound')}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => {
            const copied = copiedId === skill.id
            return (
              <Link
                key={skill.id}
                href={`/skills/${skill.id}`}
                className={`group flex flex-col rounded-xl border p-4 text-left transition-all no-underline ${
                  copied
                    ? 'border-green-400 bg-green-50'
                    : 'border-border hover:border-black hover:bg-muted/30'
                }`}
              >
                {/* Header row */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground truncate">
                    {skill.id}
                  </span>
                  <button
                    onClick={(e) => handleCopy(e, skill)}
                    className={`shrink-0 text-xs font-medium transition-colors px-1.5 py-0.5 rounded hover:bg-muted ${copied ? 'text-green-600' : 'text-muted-foreground'}`}
                  >
                    {copied ? t('skills.copied') : t('skills.copyUrl')}
                  </button>
                </div>

                {/* Name */}
                <h3 className="mb-1.5 font-medium text-black">
                  {lang === 'zh' && skill.name_zh ? skill.name_zh : skill.name}
                </h3>

                {/* Description */}
                <p className="mb-3 flex-1 text-xs text-muted-foreground line-clamp-2">
                  {lang === 'zh' && skill.description_zh
                    ? skill.description_zh
                    : skill.content?.replace(/^---[\s\S]*?---\s*/m, '').replace(/#{1,6}\s/g, '').replace(/\n/g, ' ').slice(0, 120)}
                </p>

                {/* Bottom row: ecosystem + signals */}
                <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ecosystemClass(skill.ecosystem)}`}>
                    {skill.ecosystem.charAt(0).toUpperCase() + skill.ecosystem.slice(1)}
                  </span>
                  {(skill.install_count ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ⚡ {formatInstallCount(skill.install_count!)}{lang === 'zh' ? ' 次' : ''}
                    </span>
                  )}
                  {skill.last_verified_at && (
                    <span className="text-xs text-muted-foreground">
                      🔄 {timeAgo(skill.last_verified_at)}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
