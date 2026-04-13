#!/usr/bin/env node
/**
 * Import Starknet official skills from keep-starknet-strange/starknet-agentic
 * Source: https://github.com/keep-starknet-strange/starknet-agentic
 * Maintainer: keep-starknet-strange (Starknet official community org)
 */

const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const MAX_CONTENT_BYTES = 40 * 1024 // 40KB

const RAW_BASE = 'https://raw.githubusercontent.com/keep-starknet-strange/starknet-agentic/main'
const SOURCE_REPO = 'keep-starknet-strange/starknet-agentic'
const MAINTAINER = 'keep-starknet-strange'

// All SKILL.md files in the skills/ directory
const SKILLS = [
  { slug: 'account-abstraction',       type: 'guide',    tags: ['account-abstraction', 'starknet', 'smart-account'] },
  { slug: 'cairo-auditor',             type: 'security', tags: ['cairo', 'auditing', 'security', 'starknet'] },
  { slug: 'cairo-contract-authoring',  type: 'guide',    tags: ['cairo', 'smart-contracts', 'starknet'] },
  { slug: 'cairo-deploy',              type: 'guide',    tags: ['cairo', 'deploy', 'starknet'] },
  { slug: 'cairo-optimization',        type: 'guide',    tags: ['cairo', 'optimization', 'gas', 'starknet'] },
  { slug: 'cairo-testing',             type: 'testing',  tags: ['cairo', 'testing', 'starknet'] },
  { slug: 'controller-cli',            type: 'guide',    tags: ['cli', 'controller', 'starknet'] },
  { slug: 'huginn-onboard',            type: 'guide',    tags: ['huginn', 'onboarding', 'starknet', 'agent'] },
  { slug: 'starknet-anonymous-wallet', type: 'guide',    tags: ['wallet', 'anonymous', 'privacy', 'starknet'] },
  { slug: 'starknet-defi',             type: 'guide',    tags: ['defi', 'starknet', 'protocol'] },
  { slug: 'starknet-identity',         type: 'guide',    tags: ['identity', 'starknet', 'domain'] },
  { slug: 'starknet-js',               type: 'docs',     tags: ['starknet.js', 'javascript', 'sdk', 'starknet'] },
  { slug: 'starknet-mini-pay',         type: 'guide',    tags: ['payment', 'starknet', 'defi'] },
  { slug: 'starknet-network-facts',    type: 'docs',     tags: ['network', 'starknet', 'reference'] },
  { slug: 'starknet-tongo',            type: 'guide',    tags: ['tongo', 'starknet', 'sdk'] },
  { slug: 'starknet-wallet',           type: 'guide',    tags: ['wallet', 'starknet', 'argent', 'braavos'] },
  { slug: 'starkzap-sdk',              type: 'docs',     tags: ['starkzap', 'sdk', 'starknet', 'erc20'] },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Starknet Official Skills Importer ===')
  console.log(`Source: ${SOURCE_REPO}`)
  console.log(`Started at ${new Date().toISOString()}\n`)

  if (!SUPABASE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_KEY env var is not set')
    process.exit(1)
  }

  const records = []
  const failed = []

  for (const { slug, type, tags } of SKILLS) {
    const url = `${RAW_BASE}/skills/${slug}/SKILL.md`
    const id = `starknet/${slug}`

    try {
      console.log(`  Fetching ${slug}...`)
      const raw = await fetchText(url)

      if (raw.length < 50) throw new Error('Content too short, likely 404')

      const content = truncate(raw)
      const name = extractName(raw, slug.replace(/-/g, ' '))

      records.push({
        id,
        name,
        ecosystem: 'starknet',
        type,
        source: 'official',
        confidence: 'high',
        version: '1.0.0',
        source_repo: SOURCE_REPO,
        maintainer: MAINTAINER,
        content,
        tags,
      })
      console.log(`  ✓ ${id}  →  ${name}`)
    } catch (err) {
      console.error(`  ✗ FAILED ${slug}: ${err.message}`)
      failed.push(slug)
    }
  }

  if (records.length === 0) {
    console.log('\nNo records to insert.')
    return
  }

  console.log(`\n=== Upserting ${records.length} records to Supabase... ===`)

  const BATCH = 20
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    try {
      await upsertBatch(batch)
      successCount += batch.length
      console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ✓ ${batch.length} records`)
    } catch (err) {
      console.error(`  Batch ${Math.floor(i / BATCH) + 1}: ✗ ${err.message}`)
      failCount += batch.length
      failed.push(...batch.map(r => r.id))
    }
  }

  console.log('\n=== Final Summary ===')
  console.log(`✓ Successfully inserted/updated: ${successCount}`)
  console.log(`✗ Failed: ${failCount}`)

  if (failed.length > 0) {
    console.log('\nFailed items:')
    for (const f of failed) console.log(`  - ${f}`)
  }

  console.log(`\nDone at ${new Date().toISOString()}`)
}

main().catch(err => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
