import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { siteUrl } from '@/lib/site-url'

/**
 * GET /api/v1/grants/{id}/context
 *
 * Returns a context bundle for AI agents to assist users in applying for a grant/bounty.
 * The bundle includes:
 *   1. grant_info       — the grant's full details (title, description, requirements, deadline)
 *   2. ecosystem_skills — relevant skills from the grant's required ecosystems (max 5 per ecosystem)
 *   3. api_guide        — the AgentRel "how to use" skill for agents to know how to apply via API
 *
 * Usage:
 *   GET /api/v1/grants/{id}/context
 *   Response: { grant, ecosystem_skills: Skill[], api_guide: string, apply_endpoint: string }
 *
 * The agent should:
 *   1. Read grant requirements from `grant`
 *   2. Use `ecosystem_skills` as context when answering the user's questions
 *   3. Call POST /api/v1/grants/{id}/apply (with Bearer token) to submit the application
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: grantId } = await params
  const db = serviceClient

  // 1. Fetch grant
  const { data: grant, error: grantError } = await db
    .from('grants')
    .select('id, title, description, sponsor, reward, deadline, required_skills, min_reputation_score, status, application_fields, application_schema, tech_requirements, track, external_url, template_md')
    .eq('id', grantId)
    .single()

  if (grantError || !grant) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  }

  // 2. Derive ecosystems from required_skills
  // required_skills is an array like ['ethereum', 'solana', 'agent']
  // We match these to skill ecosystem values (case-insensitive)
  const requiredSkills: string[] = (grant.required_skills as string[]) ?? []
  const ecosystems = requiredSkills
    .map((s: string) => s.toLowerCase())
    .filter((s: string) => s !== 'agent' && s !== 'web3') // exclude generic tags

  // 3. Fetch top relevant skills per ecosystem (official/verified first, max 5 per ecosystem, max 15 total)
  let ecosystemSkills: Array<{ id: string; name: string; ecosystem: string; type: string; source: string; skill_url: string }> = []

  if (ecosystems.length > 0) {
    const { data: skills } = await db
      .from('skills')
      .select('id, name, ecosystem, type, source')
      .in('ecosystem', ecosystems)
      .gte('health_score', 0)
      .in('source', ['official', 'verified', 'official-docs'])  // quality filter
      .not('type', 'in', '("hackathon-case","security-vuln")')  // exclude noise types
      .order('source', { ascending: true })  // official first
      .limit(15)

    ecosystemSkills = (skills ?? []).map((s) => ({
      id: s.id,
      name: s.name as string,
      ecosystem: s.ecosystem as string,
      type: s.type as string,
      source: s.source as string,
      skill_url: siteUrl(`/api/skills/${s.id}.md`),
    }))
  }

  // 4. Fetch AgentRel API usage guide
  const { data: apiGuide } = await db
    .from('skills')
    .select('id, name, content')
    .eq('id', 'agentrel/how-to-use')
    .single()

  const apiGuideContent = (apiGuide?.content as string) ?? ''

  // 5. Build response
  const now = new Date()
  const deadline = grant.deadline ? new Date(grant.deadline as string) : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

  return NextResponse.json({
    grant: {
      id: grant.id,
      title: grant.title,
      description: grant.description,
      sponsor: grant.sponsor,
      reward: grant.reward,
      deadline: grant.deadline,
      days_left: daysLeft,
      status: grant.status,
      required_skills: grant.required_skills,
      min_reputation_score: grant.min_reputation_score,
      application_fields: grant.application_fields,
      application_schema: grant.application_schema,
      tech_requirements: grant.tech_requirements,
      track: grant.track,
      external_url: grant.external_url,
      template_md: grant.template_md,
    },
    ecosystem_skills: ecosystemSkills,
    api_guide: apiGuideContent,
    apply_endpoint: {
      method: 'POST',
      url: `/api/v1/grants/${grantId}/apply`,
      auth: 'Bearer <api_key or access_token>',
      body_example: {
        pitch: 'Your project pitch here',
        custom_fields: {},
      },
    },
    _meta: {
      ecosystems_matched: ecosystems,
      skills_count: ecosystemSkills.length,
      generated_at: now.toISOString(),
    },
  })
}
