import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { ECOSYSTEM_REPOS, ECOSYSTEM_SKILL_TARGETS } from '@/lib/crawler-config'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GitHubIssue {
  number: number
  title: string
  body: string | null
  labels: { name: string }[]
}

interface GitHubPR {
  number: number
  title: string
  body: string | null
  merged_at: string | null
  labels: { name: string }[]
}

interface CrawlerState {
  repo: string
  ecosystem: string
  last_crawled_at: string
}

// ─── GitHub helpers ───────────────────────────────────────────────────────────

async function fetchClosedIssues(repo: string, since: string): Promise<GitHubIssue[]> {
  const url = `https://api.github.com/repos/${repo}/issues?state=closed&per_page=50&since=${since}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`GitHub issues ${repo}: ${res.status}`)
  const data: GitHubIssue[] = await res.json()
  // GitHub issues endpoint returns PRs too — filter them out
  return data.filter((i) => !(i as unknown as { pull_request?: unknown }).pull_request)
}

async function fetchMergedPRs(repo: string, since: string): Promise<GitHubPR[]> {
  const url = `https://api.github.com/repos/${repo}/pulls?state=closed&per_page=30&sort=updated&direction=desc`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`GitHub PRs ${repo}: ${res.status}`)
  const data: GitHubPR[] = await res.json()
  return data.filter(
    (pr) => pr.merged_at !== null && new Date(pr.merged_at) > new Date(since)
  )
}

// ─── Zenmux / Claude ──────────────────────────────────────────────────────────

async function analyseWithClaude(
  ecosystem: string,
  issues: GitHubIssue[],
  prs: GitHubPR[]
): Promise<string> {
  const issuesSummary = issues
    .slice(0, 30)
    .map((i) => `### Issue #${i.number}: ${i.title}\n${(i.body ?? '').slice(0, 300)}`)
    .join('\n---\n')

  const prsSummary = prs
    .slice(0, 20)
    .map((p) => `### PR #${p.number}: ${p.title}\n${(p.body ?? '').slice(0, 300)}`)
    .join('\n---\n')

  const prompt = `You are analyzing recent GitHub activity from the ${ecosystem} ecosystem repositories to extract developer-relevant information.

Recent Issues:
${issuesSummary || '(none)'}

Recent Merged PRs:
${prsSummary || '(none)'}

Please extract two concise sections:

## Common Pitfalls
List up to 5 pitfalls/gotchas developers encounter. For each:
**Problem:** What goes wrong
**Fix:** How to solve it
**Version:** Versions affected (or "all")

## Breaking Changes & Migration Notes
List any breaking API changes or deprecations with before/after guidance. Skip if none found.

Keep each item brief. Skip CI/infra-only changes. Focus on Solidity/SDK developer impact.`

  const res = await fetch('https://zenmux.ai/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ZENMUX_API_KEY!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Zenmux: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data.content[0] as { text: string }).text
}

// ─── Content injection ────────────────────────────────────────────────────────

const MARKER_START = '<!-- AUTO-UPDATED:START -->'
const MARKER_END = '<!-- AUTO-UPDATED:END -->'

function injectAutoBlock(existing: string, newBlock: string): string {
  const timestamped = `${MARKER_START}\n*Last updated: ${new Date().toISOString().slice(0, 10)}*\n\n${newBlock}\n${MARKER_END}`
  if (existing.includes(MARKER_START)) {
    return existing.replace(/<!-- AUTO-UPDATED:START -->[\s\S]*?<!-- AUTO-UPDATED:END -->/, timestamped)
  }
  return `${existing}\n\n---\n\n${timestamped}`
}

// ─── Crawler state ────────────────────────────────────────────────────────────

async function getLastCrawledAt(repo: string): Promise<string> {
  const { data } = await serviceClient
    .from('crawler_state')
    .select('last_crawled_at')
    .eq('repo', repo)
    .single()
  if (data?.last_crawled_at) return data.last_crawled_at
  // Default: 30 days ago
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
}

async function upsertCrawlerState(repo: string, ecosystem: string): Promise<void> {
  await serviceClient.from('crawler_state').upsert(
    { repo, ecosystem, last_crawled_at: new Date().toISOString() },
    { onConflict: 'repo' }
  )
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { repo: string; status: string; newItems?: number }[] = []
  let totalUpdated = 0

  for (const [ecosystem, repos] of Object.entries(ECOSYSTEM_REPOS)) {
    const skillTargets = ECOSYSTEM_SKILL_TARGETS[ecosystem] ?? []
    if (skillTargets.length === 0) continue

    const allIssues: GitHubIssue[] = []
    const allPRs: GitHubPR[] = []

    for (const repo of repos) {
      try {
        const since = await getLastCrawledAt(repo)
        const [issues, prs] = await Promise.all([
          fetchClosedIssues(repo, since),
          fetchMergedPRs(repo, since),
        ])

        allIssues.push(...issues)
        allPRs.push(...prs)
        results.push({ repo, status: 'fetched', newItems: issues.length + prs.length })
      } catch (err) {
        results.push({ repo, status: `error: ${(err as Error).message}` })
      }
    }

    const hasNewData = allIssues.length > 0 || allPRs.length > 0
    if (!hasNewData) continue

    // Analyse with Claude
    let analysis: string
    try {
      analysis = await analyseWithClaude(ecosystem, allIssues, allPRs)
    } catch (err) {
      results.push({ repo: `${ecosystem}/claude`, status: `error: ${(err as Error).message}` })
      continue
    }

    // Update each target skill
    for (const skillId of skillTargets) {
      try {
        const { data: skillRow, error } = await serviceClient
          .from('skills')
          .select('content')
          .eq('id', skillId)
          .single()

        if (error || !skillRow) {
          results.push({ repo: skillId, status: 'skill not found' })
          continue
        }

        const updatedContent = injectAutoBlock(skillRow.content, analysis)
        const { error: updateError } = await serviceClient
          .from('skills')
          .update({ content: updatedContent })
          .eq('id', skillId)

        if (updateError) throw new Error(updateError.message)
        totalUpdated++
        results.push({ repo: skillId, status: 'updated' })
      } catch (err) {
        results.push({ repo: skillId, status: `error: ${(err as Error).message}` })
      }
    }

    // Persist crawler state for all repos in this ecosystem
    for (const repo of repos) {
      try {
        await upsertCrawlerState(repo, ecosystem)
      } catch {
        // Non-fatal — state will just re-crawl from 30 days ago next time
      }
    }
  }

  return NextResponse.json({
    updated: totalUpdated,
    repos: results,
    ran_at: new Date().toISOString(),
  })
}
