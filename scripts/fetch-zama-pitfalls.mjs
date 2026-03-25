import { writeFileSync } from 'fs'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const ZENMUX_KEY = 'sk-ss-v1-196d706809b60c6ccf68e30afa1a711ce1b834674822781bd972b3885ab640e0'

async function fetchIssues(repo, perPage) {
  const url = `https://api.github.com/repos/${repo}/issues?state=closed&per_page=${perPage}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub API error for ${repo}: ${res.status} ${text}`)
  }
  return res.json()
}

function isRelevant(issue) {
  const labels = (issue.labels || []).map((l) => l.name.toLowerCase())
  const hasRelevantLabel = labels.some((l) => l.includes('bug') || l.includes('question') || l.includes('help'))
  const bodyLower = (issue.body || '').toLowerCase()
  const titleLower = (issue.title || '').toLowerCase()
  const relevantKeywords = ['how do', 'error', 'cannot', 'failed', "can't", 'issue', 'problem', 'undefined', 'revert', 'fail', 'wrong', 'not work']
  const hasKeyword = relevantKeywords.some((k) => bodyLower.includes(k) || titleLower.includes(k))
  return hasRelevantLabel || hasKeyword
}

function formatIssue(issue) {
  const body = (issue.body || '').slice(0, 600).replace(/\r\n/g, '\n')
  return `### Issue #${issue.number}: ${issue.title}\n${body}\n`
}

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
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Zenmux API error: ${res.status} ${text}`)
  }
  const data = await res.json()
  return data.content[0].text
}

async function main() {
  console.log('Fetching zama-ai/fhevm issues...')
  const fhevmIssues = await fetchIssues('zama-ai/fhevm', 100)
  console.log(`  Total: ${fhevmIssues.length}, filtering...`)
  const fhevmRelevant = fhevmIssues.filter(isRelevant)
  console.log(`  Relevant: ${fhevmRelevant.length}`)

  console.log('Fetching zama-ai/fhevm-hardhat-template issues...')
  const templateIssues = await fetchIssues('zama-ai/fhevm-hardhat-template', 50)
  console.log(`  Total: ${templateIssues.length}, filtering...`)
  const templateRelevant = templateIssues.filter(isRelevant)
  console.log(`  Relevant: ${templateRelevant.length}`)

  const allIssues = [...fhevmRelevant, ...templateRelevant]
  const issuesContent = allIssues.map(formatIssue).join('\n---\n\n')

  console.log(`\nCalling Claude to extract pitfalls from ${allIssues.length} issues...`)
  const prompt = `You are analyzing GitHub issues from the zama-ai/fhevm repository to extract developer pain points.

Here are the issues:
${issuesContent}

Please extract the top 8-10 most common pitfalls and gotchas that developers encounter when building with fhEVM. Format as:

## Common Pitfalls

### 1. [Pitfall Title]
**Problem:** What goes wrong
**Fix:** How to solve it
**Version:** Which versions are affected (if known)

Focus on: ACL permission errors, Gateway decryption issues, type mismatches, Hardhat setup problems, network config errors. Skip trivial or duplicate issues.`

  const pitfalls = await callClaude(prompt)
  console.log('\n=== EXTRACTED PITFALLS ===\n')
  console.log(pitfalls)
  console.log('\n=========================\n')

  writeFileSync('/tmp/zama-pitfalls.md', pitfalls)
  console.log('Pitfalls saved to /tmp/zama-pitfalls.md')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
