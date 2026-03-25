import { createClient } from '@supabase/supabase-js'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const ZENMUX_KEY = 'sk-ss-v1-196d706809b60c6ccf68e30afa1a711ce1b834674822781bd972b3885ab640e0'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─── GitHub helpers ───────────────────────────────────────────────────────────

async function fetchMergedPRs(repo, perPage) {
  const url = `https://api.github.com/repos/${repo}/pulls?state=closed&per_page=${perPage}&sort=updated&direction=desc`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) throw new Error(`GitHub ${repo}: ${res.status} ${await res.text()}`)
  const all = await res.json()
  return all.filter((pr) => pr.merged_at !== null)
}

function formatPR(pr) {
  const labels = (pr.labels || []).map((l) => l.name).join(', ') || 'none'
  const body = (pr.body || '').slice(0, 500).replace(/\r\n/g, '\n')
  return `### PR #${pr.number}: ${pr.title}\nMerged: ${pr.merged_at} | Labels: ${labels}\n${body}\n`
}

// ─── Zenmux / Claude ──────────────────────────────────────────────────────────

async function callClaude(prompt) {
  const res = await fetch('https://zenmux.ai/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ZENMUX_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Zenmux: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function getSkillContent(id) {
  const { data, error } = await supabase.from('skills').select('content').eq('id', id).single()
  if (error) throw new Error(`Supabase fetch ${id}: ${error.message}`)
  return data.content
}

async function updateSkillContent(id, content) {
  const { error } = await supabase.from('skills').update({ content }).eq('id', id)
  if (error) throw new Error(`Supabase update ${id}: ${error.message}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Step 1 — fetch PRs
  console.log('Fetching merged PRs from zama-ai/fhevm ...')
  const fhevmPRs = await fetchMergedPRs('zama-ai/fhevm', 100)
  console.log(`  Merged: ${fhevmPRs.length}`)

  console.log('Fetching merged PRs from zama-ai/fhevm-hardhat-template ...')
  const templatePRs = await fetchMergedPRs('zama-ai/fhevm-hardhat-template', 50)
  console.log(`  Merged: ${templatePRs.length}`)

  const allPRs = [...fhevmPRs, ...templatePRs]
  const prContent = allPRs.map(formatPR).join('\n---\n\n')

  // Step 2 — Claude analysis
  console.log(`\nCalling Claude to analyse ${allPRs.length} merged PRs ...`)
  const prompt = `You are analyzing merged Pull Requests from the zama-ai/fhevm repository to extract developer-relevant information.

Here are the merged PRs:
${prContent}

Please extract:

## Breaking Changes & Migration Notes
List any breaking changes found in PRs, with before/after migration guidance. Format:
### [Version or PR title]
- **Changed:** What changed
- **Before:** Old usage
- **After:** New usage

## Key Design Decisions
List 3-5 important architectural/design decisions visible in the PRs that developers should know about (e.g., why certain approaches were chosen, what alternatives were rejected).

## Deprecated Patterns
Any patterns or APIs that were removed or deprecated, with recommended alternatives.

Focus on developer-facing changes. Skip CI/infra-only PRs.`

  const analysis = await callClaude(prompt)
  console.log('\n=== PR ANALYSIS ===\n')
  console.log(analysis)
  console.log('\n===================\n')

  // Step 3 — append to fhevm-dev-guide and testing-guide
  const appendBlock = `\n\n---\n\n<!-- Derived from zama-ai/fhevm merged PRs — auto-updated -->\n${analysis}`

  for (const skillId of ['zama/fhevm-dev-guide', 'zama/testing-guide']) {
    console.log(`Updating ${skillId} ...`)
    const current = await getSkillContent(skillId)
    // Remove any previous auto-updated block to avoid duplication
    const stripped = current.replace(/\n\n---\n\n<!-- Derived from zama-ai\/fhevm merged PRs.*$/s, '')
    await updateSkillContent(skillId, stripped + appendBlock)
    console.log(`  ✓ Updated`)
  }

  console.log('\nAll done!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
