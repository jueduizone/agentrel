import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/agentAuth'
import { serviceClient } from '@/lib/supabase'

type FeedbackBody = {
  skill_id: string
  agent?: string
  issue?: string
  comment?: string  // alias for issue
  feedback?: string  // alias for issue
  code_snippet?: string
  error_message?: string
  fix?: string
}

async function createGitHubIssue(body: FeedbackBody): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_SKILLS_REPO ?? 'jueduizone/agentrel'

  if (!token) return null

  const issueText = (body as FeedbackBody & { comment?: string; feedback?: string }).issue || (body as FeedbackBody & { comment?: string; feedback?: string }).comment || (body as FeedbackBody & { comment?: string; feedback?: string }).feedback || ''
  const issueBody = [
    `**Skill:** \`${body.skill_id}\``,
    `**Reported by agent:** ${body.agent ?? 'anonymous'}`,
    '',
    '## Issue',
    issueText,
    body.code_snippet
      ? `\n## Code Snippet\n\`\`\`\n${body.code_snippet}\n\`\`\``
      : '',
    body.error_message
      ? `\n## Error Message\n\`\`\`\n${body.error_message}\n\`\`\``
      : '',
    body.fix
      ? `\n## Suggested Fix\n\`\`\`\n${body.fix}\n\`\`\``
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        title: `[Feedback] ${body.skill_id}: ${issueText.slice(0, 80)}`,
        body: issueBody,
        labels: ['feedback', `skill:${body.skill_id}`],
      }),
    })

    if (!res.ok) return null

    const issue = await res.json() as { number: number }
    return issue.number
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const raw = body as FeedbackBody & { comment?: string; feedback?: string }
  const { skill_id, agent, code_snippet, error_message, fix } = raw
  const issue = raw.issue || raw.comment || raw.feedback || ''

  if (!skill_id || !issue) {
    return NextResponse.json(
      { error: 'skill_id and issue are required' },
      { status: 400 }
    )
  }

  // Create GitHub issue
  const githubIssueId = await createGitHubIssue({ skill_id, agent, issue, code_snippet, error_message, fix })

  // Store in DB
  const { error: dbError } = await serviceClient.from('skill_feedback').insert({
    skill_id,
    agent: agent ?? null,
    issue,
    code_snippet: code_snippet ?? null,
    error_message: error_message ?? null,
    fix: fix ?? null,
    github_issue_id: githubIssueId,
    status: 'open',
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: githubIssueId
      ? `Feedback submitted! GitHub issue #${githubIssueId} created.`
      : 'Feedback submitted!',
    github_issue_id: githubIssueId,
  })
}
