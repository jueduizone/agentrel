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

  let ecosystemSkills: Array<{ id: string; name: string; ecosystem: string; content: string }> = []
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

  const skillsContext = ecosystemSkills.length > 0
    ? ecosystemSkills.map((s) => {
        const snippet = s.content.replace(/^---[\s\S]*?---\s*/m, '').trim().slice(0, 500)
        return `## ${s.name}\n\n_Ecosystem: ${s.ecosystem} · Skill ID: \`${s.id}\`_\n\n${snippet}\n`
      }).join('\n')
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
