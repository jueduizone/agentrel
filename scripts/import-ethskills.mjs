#!/usr/bin/env node

const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_KEY'

const SLUGS = [
  'ship', 'why', 'gas', 'wallets', 'l2s', 'standards', 'tools',
  'building-blocks', 'orchestration', 'addresses', 'concepts', 'security',
  'testing', 'indexing', 'frontend-ux', 'frontend-playbook', 'qa', 'audit',
  'protocol', 'defi'
]

const GUIDE_SLUGS = new Set(['ship', 'why', 'concepts', 'security', 'qa', 'audit'])

function getType(slug) {
  return GUIDE_SLUGS.has(slug) ? 'guide' : 'docs'
}

function getTags(slug) {
  const parts = slug.split('-')
  return [...new Set([...parts, 'ethereum'])]
}

function extractName(content, slug) {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) return match[1].trim()
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return await res.text()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

async function fetchConcurrent(slugs, concurrency = 5) {
  const results = []
  for (let i = 0; i < slugs.length; i += concurrency) {
    const batch = slugs.slice(i, i + concurrency)
    const fetched = await Promise.allSettled(
      batch.map(async (slug) => {
        const url = `https://ethskills.com/${slug}/SKILL.md`
        console.log(`Fetching: ${url}`)
        const content = await fetchWithRetry(url)
        return { slug, content }
      })
    )
    for (const result of fetched) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error(`FAILED: ${result.reason?.message}`)
      }
    }
  }
  return results
}

async function upsertSkills(records) {
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

async function main() {
  console.log(`\nFetching ${SLUGS.length} ETHSkills...\n`)
  const fetched = await fetchConcurrent(SLUGS)

  const records = fetched.map(({ slug, content }) => ({
    id: `ethereum/ethskills-${slug}`,
    name: extractName(content, slug),
    ecosystem: 'ethereum',
    type: getType(slug),
    source: 'verified',
    confidence: 'high',
    version: '1.0.0',
    source_repo: 'austingriffith/ethskills',
    maintainer: 'Austin Griffith / ETHSkills',
    content,
    tags: getTags(slug),
  }))

  console.log(`\nUpserting ${records.length} records to Supabase...\n`)
  const inserted = await upsertSkills(records)

  console.log('\n=== Results ===')
  for (const r of records) {
    console.log(`  ${r.id}  →  ${r.name}`)
  }
  console.log(`\nTotal inserted/updated: ${records.length}`)
}

main().catch(err => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
