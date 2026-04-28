export type GrantContextSkill = {
  id: string
  name?: string
  ecosystem?: string
  source?: string
  type?: string
  health_score?: number | null
  install_count?: number | null
  updated_at?: string | null
  content?: string | null
}

export type GrantRequirementSections = {
  submissionRequirements: string[]
  judgingCriteria: string[]
  exampleIdeas: string[]
  other: string[]
}

const QUALITY_SOURCES = new Set(['official', 'verified', 'official-docs'])

const SOURCE_RANK: Record<string, number> = {
  official: 0,
  'official-docs': 1,
  verified: 2,
  community: 3,
}

function healthScore(skill: GrantContextSkill) {
  return typeof skill.health_score === 'number' ? skill.health_score : 0
}

function installCount(skill: GrantContextSkill) {
  return typeof skill.install_count === 'number' ? skill.install_count : 0
}

function updatedTime(skill: GrantContextSkill) {
  return skill.updated_at ? new Date(skill.updated_at).getTime() || 0 : 0
}

function compareSkills(a: GrantContextSkill, b: GrantContextSkill) {
  const sourceDiff = (SOURCE_RANK[a.source ?? ''] ?? 10) - (SOURCE_RANK[b.source ?? ''] ?? 10)
  if (sourceDiff !== 0) return sourceDiff
  const healthDiff = healthScore(b) - healthScore(a)
  if (healthDiff !== 0) return healthDiff
  const installDiff = installCount(b) - installCount(a)
  if (installDiff !== 0) return installDiff
  return updatedTime(b) - updatedTime(a)
}

export function normalizeEcosystems(requiredSkills: string[]) {
  return Array.from(new Set((requiredSkills ?? [])
    .map((skill) => String(skill).toLowerCase().trim())
    .filter((skill) => skill && skill !== 'agent' && skill !== 'web3')))
}

export function selectSkillsForGrantContext<T extends GrantContextSkill>(skills: T[], ecosystems: string[], limit = 10) {
  const normalizedEcosystems = normalizeEcosystems(ecosystems)
  const selected: T[] = []

  for (const ecosystem of normalizedEcosystems) {
    const healthyForEcosystem = (skills ?? [])
      .filter((skill) => String(skill.ecosystem ?? '').toLowerCase() === ecosystem)
      .filter((skill) => healthScore(skill) >= 0)
      .filter((skill) => !['hackathon-case', 'security-vuln'].includes(String(skill.type ?? '')))

    const qualityMatches = healthyForEcosystem
      .filter((skill) => QUALITY_SOURCES.has(String(skill.source ?? '')))
      .sort(compareSkills)

    const fallbackMatches = healthyForEcosystem.sort(compareSkills)
    selected.push(...(qualityMatches.length > 0 ? qualityMatches : fallbackMatches).slice(0, 4))
  }

  return selected.sort(compareSkills).slice(0, limit)
}

export function renderApplyBodyExample() {
  return `{
  "pitch": "your proposal text",
  "custom_fields": {
    "github_url": "https://github.com/...",
    "demo_url": "https://...",
    "video_url": "https://..."
  }
}`
}

export function splitGrantRequirementText(text: string | null | undefined) {
  if (!text) return []
  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => line.split(/\s+[-•]\s+/).filter(Boolean))
    .map((line) => line.replace(/^[-•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

export function extractGrantRequirementSections(text: string | null | undefined): GrantRequirementSections {
  const sections: GrantRequirementSections = {
    submissionRequirements: [],
    judgingCriteria: [],
    exampleIdeas: [],
    other: [],
  }
  let current: keyof GrantRequirementSections = 'other'

  for (const item of splitGrantRequirementText(text)) {
    const normalized = item.toLowerCase().replace(/:$/, '')
    if (/submission|requirement/.test(normalized)) {
      current = 'submissionRequirements'
      continue
    }
    if (/judging|criteria|evaluation/.test(normalized)) {
      current = 'judgingCriteria'
      continue
    }
    if (/example|idea|direction/.test(normalized)) {
      current = 'exampleIdeas'
      continue
    }
    sections[current].push(item)
  }

  return sections
}
