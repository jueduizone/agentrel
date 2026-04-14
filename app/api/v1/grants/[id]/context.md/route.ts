import { NextRequest } from 'next/server'
import { serviceClient } from '@/lib/supabase'

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
  const ecosystems = requiredSkills
    .map((s) => s.toLowerCase())
    .filter((s) => s !== 'agent' && s !== 'web3')

  let ecosystemSkills: Array<{ id: string; name: string; ecosystem: string; content: string }> = []
  if (ecosystems.length > 0) {
    const { data: skills } = await db
      .from('skills')
      .select('id, name, ecosystem, content, source')
      .in('ecosystem', ecosystems)
      .in('source', ['official', 'verified', 'official-docs'])
      .not('type', 'in', '("hackathon-case","security-vuln")')
      .order('source', { ascending: true })
      .limit(10)
    ecosystemSkills = (skills ?? []).map((s) => ({
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
    : '_No official skills matched the required ecosystems._'

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
{
  "proposal": "your proposal text",
  "github_url": "https://github.com/..."
}
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
