import { serviceClient } from './supabase'

interface Grant {
  id: string
  title: string
  description?: string | null
  reward?: string | null
  deadline?: string | null
  status: string
  sponsor?: string | null
  track?: string | null
  application_schema?: string | null
  source_type?: string
  tech_requirements?: string | null
  required_skills?: string[] | null
}

type RelatedSkill = {
  id: string
  name: string
  ecosystem: string
  source: string
  type: string
  content: string
}

function skillRelevance(skill: RelatedSkill) {
  const key = `${skill.id} ${skill.name} ${skill.type}`.toLowerCase()
  if (/concept|overview|basics/.test(key)) return 'Domain primer: read first to understand core concepts and vocabulary.'
  if (/fhevm|solidity|contract|dev-guide/.test(key)) return 'Implementation path: use when designing and coding the confidential smart contract.'
  if (/gateway|decrypt|relayer|frontend|hardhat/.test(key)) return 'App integration: use when wiring frontend encryption, decrypt flows, or tests.'
  if (/tfhe|rust/.test(key)) return 'Deeper cryptography/runtime reference; fetch only if the project needs low-level FHE details.'
  return 'Relevant ecosystem context for planning, implementation, or proposal wording.'
}

function readingRank(skill: RelatedSkill) {
  const key = `${skill.id} ${skill.name}`.toLowerCase()
  if (/concept|overview|basics/.test(key)) return 0
  if (/fhevm|solidity|contract|dev-guide/.test(key)) return 1
  if (/gateway|decrypt|relayer|frontend|hardhat/.test(key)) return 2
  if (/tfhe|rust/.test(key)) return 3
  return 4
}

function renderRelevantSkillsContext(skills: RelatedSkill[]) {
  const ordered = [...skills].sort((a, b) => readingRank(a) - readingRank(b))
  const inline = ordered.slice(0, 5)
  const additional = ordered.slice(5)
  if (ordered.length === 0) return '_No related ecosystem skills matched this bounty._'

  return [
    'Purpose: compact offline-friendly starter pack for agents and developers. This is not a full knowledge base dump.',
    '',
    'Usage:',
    '- Read summaries first.',
    '- If network access is available, fetch the Skill URL before drafting the implementation plan.',
    '- If links are unavailable, use summaries below as fallback context.',
    '',
    '### Recommended Reading Order',
    ...inline.map((skill, index) => `${index + 1}. [${skill.name}](https://agentrel.vercel.app/api/skills/${skill.id}.md) — ${skillRelevance(skill)}`),
    '',
    ...inline.map((skill) => {
      const content = skill.content.replace(/^---[\s\S]*?---\s*/m, '').trim()
      const maxChars = 1200
      const snippet = content.length > maxChars
        ? `${content.slice(0, maxChars).trim()}\n\n_…summary truncated; fetch the Skill URL above for the full version._`
        : content
      return `### ${skill.name}\n\n_Ecosystem: ${skill.ecosystem} · Skill ID: \`${skill.id}\` · Source: ${skill.source || 'unknown'}_\n\n- Skill URL: https://agentrel.vercel.app/api/skills/${skill.id}.md\n- Web page: https://agentrel.vercel.app/skills/${skill.id}\n- Relevance: ${skillRelevance(skill)}\n- Fetch full source when: exact APIs, constraints, examples, or edge cases affect the implementation.\n\n${snippet}`
    }),
    additional.length > 0
      ? `### Additional Relevant Skills\n\n${additional.map((skill) => `- [${skill.name}](https://agentrel.vercel.app/api/skills/${skill.id}.md) · \`${skill.id}\` — ${skillRelevance(skill)}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n')
}

function buildSkillContent(grant: Grant, relatedSkills: RelatedSkill[]): string {
  const schemaNote = grant.application_schema
    ? `\n## Application Schema\n\`\`\`json\n${typeof grant.application_schema === 'string' ? grant.application_schema : JSON.stringify(grant.application_schema, null, 2)}\n\`\`\`\n`
    : ''
  return `---
id: grant-${grant.id}
name: ${grant.title}
version: 1.0
type: grant-guide
ecosystem: web3
time_sensitivity: time-limited
source: official
confidence: high
---

## Overview

**${grant.title}**

${grant.description ?? ''}

| Field | Value |
|-------|-------|
| Sponsor | ${grant.sponsor ?? '—'} |
| Reward | ${grant.reward ?? '—'} |
| Deadline | ${grant.deadline ? new Date(grant.deadline).toLocaleDateString('zh-CN') : '—'} |
| Track | ${grant.track ?? 'Open'} |
| Status | ${grant.status} |
${schemaNote}
## Technical Requirements

${grant.tech_requirements ?? '_No specific technical requirements._'}

## Required Skills

${Array.isArray(grant.required_skills) && grant.required_skills.length > 0 ? grant.required_skills.map((skill) => `- ${skill}`).join('\n') : '_None specified._'}

## Context URL

Fetch the generated grant context for this bounty:
\`https://agentrel.vercel.app/api/v1/grants/${grant.id}/context.md\`

## Relevant Skills Context

${renderRelevantSkillsContext(relatedSkills)}

## How to Apply

Use the AgentRel grant-apply skill to submit an application:

\`\`\`
POST https://agentrel.vercel.app/api/build/${grant.id}/apply
Authorization: Bearer ***
Content-Type: application/json

{
  "pitch": "Your application pitch here...",
  "custom_fields": {
    // fields from application_schema above
  }
}
\`\`\`

Get full Skill details and the apply endpoint spec at:
\`https://agentrel.vercel.app/skills/grant-apply\`

## Feedback
\`POST https://agentrel.vercel.app/api/feedback\` with \`{ "skill": "grant-${grant.id}", "issue": "..." }\`
`
}

export async function upsertGrantSkill(grant: Grant): Promise<void> {
  const isActive = grant.status === 'open'
  const db = serviceClient
  const requiredSkills = Array.isArray(grant.required_skills) ? grant.required_skills : []
  const ecosystems = Array.from(new Set(requiredSkills.map((skill) => String(skill).toLowerCase().trim()).filter((skill) => skill && skill !== 'agent' && skill !== 'web3')))
  let relatedSkills: RelatedSkill[] = []

  if (ecosystems.length > 0) {
    const { data: skills } = await db
      .from('skills')
      .select('id, name, ecosystem, content, source, type, health_score, install_count, updated_at')
      .in('ecosystem', ecosystems)
      .gte('health_score', 0)
      .not('type', 'in', '("hackathon-case","security-vuln","grant-guide")')
      .order('health_score', { ascending: false, nullsFirst: false })
      .order('install_count', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(50)

    relatedSkills = (skills ?? []).slice(0, 10).map((skill) => ({
      id: skill.id as string,
      name: skill.name as string,
      ecosystem: skill.ecosystem as string,
      source: String(skill.source ?? ''),
      type: String(skill.type ?? ''),
      content: (skill.content as string) ?? '',
    }))
  }

  const content = buildSkillContent(grant, relatedSkills)

  await db.from('skills').upsert({
    id: `grant-${grant.id}`,
    name: grant.title,
    description: grant.description ?? null,
    ecosystem: 'web3',
    type: 'grant-guide',
    time_sensitivity: 'time-limited',
    expires_at: grant.deadline ?? null,
    source: 'official',
    confidence: 'high',
    version: '1.0',
    maintainer: '@agentrel',
    content,
    access: 'free',
    // Store grant metadata in tags for filtering
    tags: ['grant', 'bounty', 'web3', ...(grant.track ? [grant.track.toLowerCase()] : [])],
    // Use health_score=0 to hide closed grants from default listing
    health_score: isActive ? 1 : 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
}

export async function syncGrantsIndex(): Promise<void> {
  const db = serviceClient
  const { data: grants } = await db
    .from('grants')
    .select('id, title, reward, deadline, status, sponsor, track')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  const items = (grants ?? []).map(g => ({
    id: g.id,
    title: g.title,
    type: 'grant',
    reward: g.reward ?? null,
    deadline: g.deadline ?? null,
    sponsor: g.sponsor ?? null,
    skill_url: `https://agentrel.vercel.app/skills/grant-${g.id}`,
  }))

  const content = `---
id: agentrel/grants-index
name: AgentRel Grants Index
version: 1.0
type: grant-guide
ecosystem: web3
time_sensitivity: evergreen
source: official
confidence: high
---

## Open Grants & Bounties on AgentRel

This index lists all currently open Web3 grants and bounties. Each entry has a Skill URL for Agent-based application.

\`\`\`json
${JSON.stringify({ name: 'agentrel-grants-index', description: 'Index of all open Web3 grants on AgentRel', grants: items }, null, 2)}
\`\`\`

## How to use

1. Pick a grant from the list above
2. Fetch its Skill: \`GET <skill_url>\`
3. Apply: \`POST https://agentrel.vercel.app/api/build/{id}/apply\`

Last updated: ${new Date().toISOString()}
`

  await db.from('skills').upsert({
    id: 'agentrel/grants-index',
    name: 'AgentRel Grants Index',
    description: 'Index of all open Web3 grants and bounties on AgentRel',
    ecosystem: 'web3',
    type: 'grant-guide',
    time_sensitivity: 'evergreen',
    source: 'official',
    confidence: 'high',
    version: '1.0',
    maintainer: '@agentrel',
    content,
    access: 'free',
    health_score: 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
}
