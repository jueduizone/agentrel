import { NextRequest } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { normalizeEcosystems, renderApplyBodyExample, selectSkillsForGrantContext } from '@/lib/grantContextHelpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: grantId } = await params
  const db = serviceClient

  const { data: grant, error: grantError } = await db
    .from('grants')
    .select('id, title, description, sponsor, reward, deadline, required_skills, status, tech_requirements, track, external_url')
    .eq('id', grantId)
    .single()

  if (grantError || !grant) {
    return new Response(`# Grant not found\n\nNo grant with id \`${grantId}\`.\n`, {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const requiredSkills: string[] = (grant.required_skills as string[]) ?? []
  const ecosystems = normalizeEcosystems(requiredSkills)

  let ecosystemSkills: Array<{ id: string; name: string; ecosystem: string; source: string; type: string; content: string }> = []
  if (ecosystems.length > 0) {
    const { data: skills } = await db
      .from('skills')
      .select('id, name, ecosystem, content, source, type, health_score, install_count, updated_at')
      .in('ecosystem', ecosystems)
      .gte('health_score', 0)
      .not('type', 'in', '("hackathon-case","security-vuln")')
      .order('health_score', { ascending: false, nullsFirst: false })
      .order('install_count', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(50)

    ecosystemSkills = selectSkillsForGrantContext(skills ?? [], ecosystems, 10).map((s) => ({
      id: s.id as string,
      name: s.name as string,
      ecosystem: s.ecosystem as string,
      source: String(s.source ?? ''),
      type: String(s.type ?? ''),
      content: (s.content as string) ?? '',
    }))
  }

  const isOpen = grant.status === 'open'
  const statusLabel = isOpen ? 'Open' : 'Closed'
  const reward = grant.reward ?? '—'
  const deadline = grant.deadline ?? '—'
  const sponsor = grant.sponsor ?? '—'
  const description = grant.description ?? '_No description provided._'
  const requirements = grant.tech_requirements ?? '_No specific technical requirements._'

  const skillsBullets = requiredSkills.length > 0
    ? requiredSkills.map((s) => `- ${s}`).join('\n')
    : '_None specified._'

  const skillRelevance = (skill: typeof ecosystemSkills[number]) => {
    const key = `${skill.id} ${skill.name} ${skill.type}`.toLowerCase()
    if (/concept|overview|basics/.test(key)) return 'Domain primer: read first to understand core concepts and vocabulary.'
    if (/fhevm|solidity|contract|dev-guide/.test(key)) return 'Implementation path: use when designing and coding the confidential smart contract.'
    if (/gateway|decrypt|relayer|frontend|hardhat/.test(key)) return 'App integration: use when wiring frontend encryption, decrypt flows, or tests.'
    if (/tfhe|rust/.test(key)) return 'Deeper cryptography/runtime reference; fetch only if the project needs low-level FHE details.'
    return 'Relevant ecosystem context for planning, implementation, or proposal wording.'
  }

  const readingRank = (skill: typeof ecosystemSkills[number]) => {
    const key = `${skill.id} ${skill.name}`.toLowerCase()
    if (/concept|overview|basics/.test(key)) return 0
    if (/fhevm|solidity|contract|dev-guide/.test(key)) return 1
    if (/gateway|decrypt|relayer|frontend|hardhat/.test(key)) return 2
    if (/tfhe|rust/.test(key)) return 3
    return 4
  }

  const orderedSkills = [...ecosystemSkills].sort((a, b) => readingRank(a) - readingRank(b))
  const inlineSkills = orderedSkills.slice(0, 5)
  const additionalSkills = orderedSkills.slice(5)

  const skillsContext = orderedSkills.length > 0
    ? [
        'Purpose: provide a compact, offline-friendly starter pack for agents and developers. It is not a full knowledge base dump.',
        '',
        'Usage:',
        '- Read summaries first.',
        '- If network access is available, fetch the Skill URL before drafting the implementation plan.',
        '- If links are unavailable, use the summaries below as fallback context.',
        '',
        '### Recommended Reading Order',
        ...inlineSkills.map((skill, index) => `${index + 1}. [${skill.name}](https://agentrel.vercel.app/api/skills/${skill.id}.md) — ${skillRelevance(skill)}`),
        '',
        ...inlineSkills.map((skill) => {
          const skillMarkdownUrl = `https://agentrel.vercel.app/api/skills/${skill.id}.md`
          const skillPageUrl = `https://agentrel.vercel.app/skills/${skill.id}`
          const content = skill.content.replace(/^---[\s\S]*?---\s*/m, '').trim()
          const maxChars = 1200
          const snippet = content.length > maxChars
            ? `${content.slice(0, maxChars).trim()}\n\n_…summary truncated; fetch the Skill URL above for the full version._`
            : content
          return `### ${skill.name}\n\n_Ecosystem: ${skill.ecosystem} · Skill ID: \`${skill.id}\` · Source: ${skill.source || 'unknown'}_\n\n- Skill URL: ${skillMarkdownUrl}\n- Web page: ${skillPageUrl}\n- Relevance: ${skillRelevance(skill)}\n- Fetch full source when: exact APIs, constraints, examples, or edge cases affect the implementation.\n\n${snippet}`
        }),
        additionalSkills.length > 0
          ? `### Additional Relevant Skills\n\n${additionalSkills.map((skill) => `- [${skill.name}](https://agentrel.vercel.app/api/skills/${skill.id}.md) · \`${skill.id}\` — ${skillRelevance(skill)}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n')
    : '_No skills matched the required ecosystems._'

  const md = `# Grant: ${grant.title}

**Status:** ${statusLabel}
**Reward:** ${reward}
**Deadline:** ${deadline}
**Sponsor:** ${sponsor}

## Description

${description}

## Requirements

${requirements}

## Required Skills

${skillsBullets}

## How to Apply

Send a POST request to:
\`https://agentrel.vercel.app/api/v1/grants/${grantId}/apply\`

With Bearer token (user's AgentRel API key) and JSON body:
\`\`\`json
${renderApplyBodyExample()}
\`\`\`

## Relevant Skills Context

${skillsContext}
`

  return new Response(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
