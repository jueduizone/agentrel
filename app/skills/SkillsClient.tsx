'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Skill } from '@/lib/types'

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

const ALL_ECOSYSTEMS = ['ethereum', 'solana', 'aptos', 'sui', 'ton', 'cosmos', 'polkadot']
const ALL_TYPES = ['technical-doc', 'grant-guide', 'security-audit', 'tutorial', 'reference']
const ALL_SOURCES = ['official', 'community', 'ai-generated']

type Props = {
  skills: Skill[]
  initialEcosystem?: string
  initialType?: string
  initialSource?: string
  initialQ?: string
}

export function SkillsClient({ skills, initialEcosystem, initialType, initialSource, initialQ }: Props) {
  const [search, setSearch] = useState(initialQ ?? '')
  const [selectedEcosystems, setSelectedEcosystems] = useState<string[]>(
    initialEcosystem ? [initialEcosystem] : []
  )
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    initialType ? [initialType] : []
  )
  const [selectedSources, setSelectedSources] = useState<string[]>(
    initialSource ? [initialSource] : []
  )

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      if (selectedEcosystems.length && !selectedEcosystems.includes(s.ecosystem)) return false
      if (selectedTypes.length && !selectedTypes.includes(s.type)) return false
      if (selectedSources.length && !selectedSources.includes(s.source)) return false
      if (search) {
        const q = search.toLowerCase()
        const inName = s.name.toLowerCase().includes(q)
        const inTags = s.tags?.some((t) => t.toLowerCase().includes(q))
        const inId = s.id.toLowerCase().includes(q)
        if (!inName && !inTags && !inId) return false
      }
      return true
    })
  }, [skills, search, selectedEcosystems, selectedTypes, selectedSources])

  function toggleFilter(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  // Compute available ecosystems from actual data
  const availableEcosystems = [...new Set(skills.map((s) => s.ecosystem))]

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-48 shrink-0">
        <div className="sticky top-20 space-y-6">
          {/* Ecosystem */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ecosystem
            </h3>
            <div className="space-y-1">
              {(availableEcosystems.length ? availableEcosystems : ALL_ECOSYSTEMS).map((eco) => (
                <button
                  key={eco}
                  onClick={() => toggleFilter(selectedEcosystems, setSelectedEcosystems, eco)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm transition-colors ${
                    selectedEcosystems.includes(eco)
                      ? 'bg-black text-white'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="capitalize">{eco}</span>
                  {selectedEcosystems.includes(eco) && (
                    <span className="text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Type
            </h3>
            <div className="space-y-1">
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleFilter(selectedTypes, setSelectedTypes, t)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors ${
                    selectedTypes.includes(t)
                      ? 'bg-black text-white'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Source
            </h3>
            <div className="space-y-1">
              {ALL_SOURCES.map((src) => (
                <button
                  key={src}
                  onClick={() => toggleFilter(selectedSources, setSelectedSources, src)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors ${
                    selectedSources.includes(src)
                      ? 'bg-black text-white'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {(selectedEcosystems.length > 0 || selectedTypes.length > 0 || selectedSources.length > 0) && (
            <button
              onClick={() => {
                setSelectedEcosystems([])
                setSelectedTypes([])
                setSelectedSources([])
              }}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Search */}
        <div className="mb-6">
          <input
            type="search"
            placeholder="Search skills by name, id, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        {/* Results count */}
        <p className="mb-4 text-sm text-muted-foreground">
          {filtered.length} skill{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center text-muted-foreground">
            No skills found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((skill) => (
              <Link
                key={skill.id}
                href={`/skills/${skill.id}`}
                className="group flex flex-col rounded-xl border border-border p-4 transition-colors hover:border-black hover:bg-muted/30"
              >
                {/* ID badge */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {skill.id}
                  </span>
                </div>

                {/* Name */}
                <h3 className="mb-2 font-medium text-black group-hover:text-black">
                  {skill.name}
                </h3>

                {/* Description */}
                <p className="mb-3 flex-1 text-xs text-muted-foreground line-clamp-2">
                  {skill.content?.replace(/^---[\s\S]*?---\s*/m, '').replace(/#{1,6}\s/g, '').slice(0, 100)}...
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ecosystemClass(skill.ecosystem)}`}>
                    {skill.ecosystem}
                  </span>
                  {SOURCE_BADGE[skill.source] ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE[skill.source].className}`}>
                      {SOURCE_BADGE[skill.source].label}
                    </span>
                  ) : (
                    <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {skill.source}
                    </span>
                  )}
                  {skill.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
