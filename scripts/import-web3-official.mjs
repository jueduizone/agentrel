#!/usr/bin/env node

const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_KEY'
const MAX_CONTENT_BYTES = 40 * 1024 // 40KB

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(content) {
  const buf = Buffer.from(content, 'utf8')
  if (buf.length <= MAX_CONTENT_BYTES) return content
  return buf.slice(0, MAX_CONTENT_BYTES).toString('utf8') + '\n\n[truncated]'
}

function extractName(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) return match[1].trim()
  return fallback
}

function extractTags(content, extras = []) {
  const words = content.match(/\b[a-z][a-z0-9-]{3,}\b/g) || []
  const freq = {}
  for (const w of words) freq[w] = (freq[w] || 0) + 1
  const top = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)
  return [...new Set([...extras, ...top])].slice(0, 10)
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchText(url, timeout = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function upsertBatch(records) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(records),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase upsert failed: ${res.status} ${err}`)
  }
  return await res.json()
}

// ─── Source 1: Solana Foundation GitHub ─────────────────────────────────────

async function fetchSolanaFoundationSkills() {
  console.log('\n=== Source 1: Solana Foundation GitHub ===')
  const records = []
  const failed = []

  let files
  try {
    console.log('Fetching file list from GitHub API...')
    const listText = await fetchText(
      'https://api.github.com/repos/solana-foundation/solana-dev-skill/contents/'
    )
    files = JSON.parse(listText)
  } catch (err) {
    console.error(`FAILED to fetch Solana file list: ${err.message}`)
    return { records, failed: ['[file list]'] }
  }

  const mdFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.md'))
  console.log(`Found ${mdFiles.length} .md files`)

  for (const file of mdFiles) {
    const slug = file.name.replace(/\.md$/, '')
    const id = `solana/sf-${slugify(slug)}`
    try {
      console.log(`  Fetching ${file.name}...`)
      // Use raw content URL
      const rawUrl = file.download_url || `https://raw.githubusercontent.com/solana-foundation/solana-dev-skill/main/${file.name}`
      const raw = await fetchText(rawUrl)
      const content = truncate(raw)
      const name = extractName(raw, slug.replace(/-/g, ' '))
      const tags = extractTags(raw, ['solana'])

      // Infer type from filename/content
      let type = 'docs'
      if (/guide|tutorial/i.test(slug) || /^#.*(guide|tutorial)/im.test(raw)) type = 'guide'
      if (/security/i.test(slug)) type = 'security'
      if (/test/i.test(slug)) type = 'testing'

      records.push({
        id,
        name,
        ecosystem: 'solana',
        type,
        source: 'official',
        confidence: 'high',
        version: '1.0.0',
        source_repo: 'solana-foundation/solana-dev-skill',
        maintainer: 'Solana Foundation',
        content,
        tags,
      })
      console.log(`  ✓ ${id}  →  ${name}`)
    } catch (err) {
      console.error(`  ✗ FAILED ${slug}: ${err.message}`)
      failed.push(slug)
    }
  }

  return { records, failed }
}

// ─── Source 2: Base AI Agents Docs ──────────────────────────────────────────

const BASE_PAGES = [
  { url: 'https://docs.base.org/ai-agents/index.md', slug: 'overview' },
  { url: 'https://docs.base.org/ai-agents/core-concepts/agent-frameworks.md', slug: 'agent-frameworks' },
  { url: 'https://docs.base.org/ai-agents/core-concepts/wallets.md', slug: 'wallets' },
  { url: 'https://docs.base.org/ai-agents/core-concepts/payments-and-transactions.md', slug: 'payments-and-transactions' },
  { url: 'https://docs.base.org/ai-agents/core-concepts/identity-verification-auth.md', slug: 'identity-verification-auth' },
]

async function fetchBaseAISkills() {
  console.log('\n=== Source 2: Base AI Agents Docs ===')
  const records = []
  const failed = []

  for (const { url, slug } of BASE_PAGES) {
    const id = `base/ai-agents-${slug}`
    try {
      console.log(`  Fetching ${url}...`)
      const raw = await fetchText(url)
      const content = truncate(raw)
      const name = extractName(raw, slug.replace(/-/g, ' '))
      const tags = extractTags(raw, ['base', 'ai-agents', 'onchain'])

      let type = 'docs'
      if (/guide|overview|intro/i.test(slug)) type = 'guide'
      if (/security|auth/i.test(slug)) type = 'security'
      if (/payment|transaction/i.test(slug)) type = 'docs'

      records.push({
        id,
        name,
        ecosystem: 'base',
        type,
        source: 'official',
        confidence: 'high',
        version: '1.0.0',
        source_repo: 'base-org/docs',
        maintainer: 'Base (Coinbase)',
        content,
        tags,
      })
      console.log(`  ✓ ${id}  →  ${name}`)
    } catch (err) {
      console.error(`  ✗ FAILED ${slug}: ${err.message}`)
      failed.push(slug)
    }
  }

  return { records, failed }
}

// ─── Source 3: Ethereum.org llms.txt ────────────────────────────────────────

async function fetchEthereumOrgSkills() {
  console.log('\n=== Source 3: Ethereum.org llms.txt ===')
  const records = []
  const failed = []

  let llmsTxt
  try {
    console.log('  Fetching https://ethereum.org/llms.txt...')
    llmsTxt = await fetchText('https://ethereum.org/llms.txt')
  } catch (err) {
    console.error(`  FAILED to fetch llms.txt: ${err.message}`)
    return { records, failed: ['[llms.txt]'] }
  }

  // Extract URLs from llms.txt - look for lines with URLs
  const urlPattern = /https?:\/\/ethereum\.org\/[^\s)>\]"]+\.md/g
  const allUrls = [...new Set(llmsTxt.match(urlPattern) || [])]

  // Also try plain URL lines (some llms.txt formats)
  const lineUrls = llmsTxt
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('https://ethereum.org/') && !l.startsWith('#'))
    .slice(0, 50)

  const candidates = [...new Set([...allUrls, ...lineUrls])]

  // Filter for developer-related pages
  const devKeywords = /develop|build|smart.?contract|solidity|evm|token|defi|layer|l2|rollup|protocol|abi|rpc|node|client|wallet|account|gas|deploy|hardhat|foundry|web3|ethers|viem|scaffold|tutorial|guide/i
  const devUrls = candidates.filter(u => devKeywords.test(u)).slice(0, 10)

  // If not enough dev-specific, pad with whatever we have
  const urls = devUrls.length >= 5
    ? devUrls
    : candidates.slice(0, 10)

  if (urls.length === 0) {
    console.log('  No URLs found in llms.txt, trying fallback...')
    // Fallback: known ethereum.org developer pages
    urls.push(
      'https://ethereum.org/en/developers/docs/intro-to-ethereum/',
      'https://ethereum.org/en/developers/docs/smart-contracts/',
      'https://ethereum.org/en/developers/docs/accounts/',
      'https://ethereum.org/en/developers/docs/transactions/',
      'https://ethereum.org/en/developers/docs/gas/',
    )
  }

  console.log(`  Found ${urls.length} developer URLs to fetch`)

  for (const url of urls) {
    // Derive slug from URL path
    const pathParts = url.replace(/^https?:\/\/ethereum\.org/, '').replace(/\.md$/, '').split('/').filter(Boolean)
    const slug = pathParts.slice(-2).join('-') || slugify(url)
    const id = `ethereum/ethorg-${slug}`

    try {
      console.log(`  Fetching ${url}...`)
      const raw = await fetchText(url)
      // Skip very short pages (probably 404 HTML)
      if (raw.length < 200) throw new Error('Content too short, likely 404')
      const content = truncate(raw)
      const name = extractName(raw, slug.replace(/-/g, ' '))
      const tags = extractTags(raw, ['ethereum'])

      let type = 'docs'
      if (/guide|tutorial|intro/i.test(slug)) type = 'guide'
      if (/security/i.test(slug)) type = 'security'
      if (/test/i.test(slug)) type = 'testing'

      records.push({
        id,
        name,
        ecosystem: 'ethereum',
        type,
        source: 'official',
        confidence: 'high',
        version: '1.0.0',
        source_repo: 'ethereum/ethereum-org-website',
        maintainer: 'ethereum.org',
        content,
        tags,
      })
      console.log(`  ✓ ${id}  →  ${name}`)
    } catch (err) {
      console.error(`  ✗ FAILED ${url}: ${err.message}`)
      failed.push(url)
    }
  }

  return { records, failed }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== AgentRel Web3 Official Skills Importer ===')
  console.log(`Started at ${new Date().toISOString()}\n`)

  const allRecords = []
  const allFailed = []

  const [solana, base, eth] = await Promise.allSettled([
    fetchSolanaFoundationSkills(),
    fetchBaseAISkills(),
    fetchEthereumOrgSkills(),
  ])

  for (const result of [solana, base, eth]) {
    if (result.status === 'fulfilled') {
      allRecords.push(...result.value.records)
      allFailed.push(...result.value.failed)
    } else {
      console.error(`Source failed entirely: ${result.reason}`)
      allFailed.push('[source error]')
    }
  }

  if (allRecords.length === 0) {
    console.log('\nNo records to insert.')
    return
  }

  console.log(`\n=== Upserting ${allRecords.length} records to Supabase... ===`)

  // Upsert in batches of 20 to avoid request size limits
  let successCount = 0
  let failCount = 0
  const BATCH = 20
  for (let i = 0; i < allRecords.length; i += BATCH) {
    const batch = allRecords.slice(i, i + BATCH)
    try {
      await upsertBatch(batch)
      successCount += batch.length
      console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ✓ ${batch.length} records`)
    } catch (err) {
      console.error(`  Batch ${Math.floor(i / BATCH) + 1}: ✗ ${err.message}`)
      failCount += batch.length
      allFailed.push(...batch.map(r => r.id))
    }
  }

  console.log('\n=== Final Summary ===')
  console.log(`✓ Successfully inserted/updated: ${successCount}`)
  console.log(`✗ Failed: ${failCount + allFailed.filter(f => !allRecords.find(r => r.id === f)).length}`)

  if (allFailed.length > 0) {
    console.log('\nFailed items:')
    for (const f of allFailed) console.log(`  - ${f}`)
  }

  console.log(`\nDone at ${new Date().toISOString()}`)
}

main().catch(err => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
