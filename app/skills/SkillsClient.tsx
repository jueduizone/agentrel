'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Skill } from '@/lib/types'

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
    zksync:   'bg-gray-100 text-gray-700 border-gray-200',
  }
  return map[eco.toLowerCase()] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

type Props = {
  skills: Skill[]
  initialEcosystem?: string
  initialQ?: string
}

export function SkillsClient({ skills, initialEcosystem, initialQ }: Props) {
  const [search, setSearch] = useState(initialQ ?? '')
  const [selectedEcosystem, setSelectedEcosystem] = useState(initialEcosystem ?? 'all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Extract unique ecosystems from data, sorted by count
  const ecosystems = useMemo(() => {
    const counts = skills.reduce<Record<string, number>>((acc, s) => {
      acc[s.ecosystem] = (acc[s.ecosystem] ?? 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([eco]) => eco)
  }, [skills])

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      if (selectedEcosystem !== 'all' && s.ecosystem !== selectedEcosystem) return false
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
  }, [skills, search, selectedEcosystem])

  function getSkillUrl(skill: Skill): string {
    return `https://agentrel.vercel.app/api/skills/${skill.id}.md`
  }

  async function handleCopy(e: React.MouseEvent, skill: Skill) {
    e.preventDefault()
    const url = getSkillUrl(skill)
    await navigator.clipboard.writeText(url)
    setCopiedId(skill.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      {/* Search + Filter bar */}
      <div className="mb-6 space-y-3">
        <input
          type="search"
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full max-w-sm rounded-lg border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedEcosystem('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedEcosystem === 'all'
                ? 'bg-black text-white'
                : 'border border-border bg-transparent text-muted-foreground hover:border-black hover:text-foreground'
            }`}
          >
            All ({skills.length})
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
                {eco} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {filtered.length} skill{filtered.length !== 1 ? 's' : ''} · click to copy URL
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center text-muted-foreground">
          No skills found.
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
                    className={`shrink-0 text-xs font-medium transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 ${copied ? 'text-green-600' : 'text-muted-foreground'}`}
                  >
                    {copied ? '✓ Copied' : 'Copy URL'}
                  </button>
                </div>

                {/* Name */}
                <h3 className="mb-1.5 font-medium text-black">
                  {skill.name}
                </h3>

                {/* Description */}
                <p className="mb-3 flex-1 text-xs text-muted-foreground line-clamp-2">
                  {skill.content?.replace(/^---[\s\S]*?---\s*/m, '').replace(/#{1,6}\s/g, '').replace(/\n/g, ' ').slice(0, 120)}
                </p>

                {/* Ecosystem badge */}
                <span className={`self-start rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ecosystemClass(skill.ecosystem)}`}>
                  {skill.ecosystem}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
