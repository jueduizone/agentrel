import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import type { Bundle, Skill } from '@/lib/types'
import { SITE_URL } from '@/lib/site-url'

// GET /api/bundles/:id/markdown — bundle as merged markdown for agents
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data: bundle, error } = await serviceClient.from('bundles').select('*').eq('id', id).single()
  if (error || !bundle) {
    return new NextResponse('# Bundle not found\n', { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
  }
  const b = bundle as Bundle
  const { data: skills } = await serviceClient.from('skills').select('id, name, ecosystem, content').in('id', b.skills)
  const BASE = SITE_URL
  const lines = [
    `# ${b.name}`,
    b.description ? `\n> ${b.description}` : '',
    `\n**Skills included:** ${(skills ?? []).length}`,
    `**Bundle URL:** ${BASE}/api/bundles/${id}/markdown`,
    '\n---\n',
  ]
  for (const skill of (skills ?? []) as Skill[]) {
    lines.push(`## ${skill.name}`)
    lines.push(`> \`${skill.id}\` · ${skill.ecosystem}`)
    lines.push(`> ${BASE}/api/skills/${skill.id}.md\n`)
    if (skill.content) lines.push(skill.content.replace(/^---[\s\S]*?---\n?/, '').trim())
    lines.push('\n---\n')
  }
  return new NextResponse(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
