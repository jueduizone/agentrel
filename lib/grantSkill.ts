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
}

function buildSkillContent(grant: Grant): string {
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
## How to Apply

Use the AgentRel grant-apply skill to submit an application:

\`\`\`
POST https://agentrel.vercel.app/api/build/${grant.id}/apply
Authorization: Bearer <your_api_key>
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
  const content = buildSkillContent(grant)
  const db = serviceClient

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
