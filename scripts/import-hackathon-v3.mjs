#!/usr/bin/env node
/**
 * Hackathon Case Study Skills Import v3
 * Sources:
 *   1. Devpost - hardcoded known Web3 hackathon slugs (HTML scraping via curl)
 *   2. GitHub Search - hackathon winner repos
 * Output: 1 skill per project (type: hackathon-case), target 50+
 */

import { execSync } from 'child_process'

const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY =
  'process.env.SUPABASE_SERVICE_KEY'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Known active Web3 hackathon slugs on Devpost
const KNOWN_HACKATHONS = [
  { slug: 'ethboston', title: 'ETHBoston', ecosystem: 'ethereum' },
  { slug: 'ethnewyork', title: 'ETHNewYork', ecosystem: 'ethereum' },
  { slug: 'niftyhacks', title: 'NIFTYHacks', ecosystem: 'ethereum' },
  { slug: 'web3-stack-hack', title: 'Web3 Stack Hack', ecosystem: 'ethereum' },
  { slug: 'autonomous-agent', title: 'Autonomous Agent: AI x Web3 Hackathon', ecosystem: 'ethereum' },
  { slug: 'readyplayer3', title: 'READY PLAYER 3 - Web3 Gaming Hackathon', ecosystem: 'ethereum' },
  { slug: 'ud-aws-hackathon', title: 'Web3 & AI Unstoppable Hackathon', ecosystem: 'ethereum' },
  { slug: 'web3quest', title: 'Web3 Quest', ecosystem: 'ethereum' },
  { slug: 'web3-build-hackathon', title: 'Web3 BUILD Hackathon (NEAR)', ecosystem: 'near' },
  { slug: 'web3champs', title: 'Web3 World Championship', ecosystem: 'ethereum' },
  { slug: 'faberweb3', title: 'Faber Web3 Hackathon', ecosystem: 'ethereum' },
  { slug: 'web3infinityhackathon', title: 'Web3 Infinity Hackathon', ecosystem: 'ethereum' },
  { slug: 'codedao-web3-hackathon', title: 'CodeDAO Web3 Hackathon', ecosystem: 'ethereum' },
  { slug: 'global-hack-week-web3', title: 'Global Hack Week: Web3', ecosystem: 'ethereum' },
  { slug: 'global-hack-week-web3-21472', title: 'Global Hack Week: Web3 (2)', ecosystem: 'ethereum' },
  { slug: '3percent-hacks', title: '3Percent Hacks - Web3 & AI', ecosystem: 'ethereum' },
  { slug: 'partisiablockchain', title: 'Privacy in Web3 - Partisia MPC', ecosystem: 'ethereum' },
  { slug: 'meter-ethereum', title: 'Meter Ethereum Hackathon', ecosystem: 'ethereum' },
  { slug: 'metis-ethereum', title: 'Metis Ethereum Hackathon', ecosystem: 'ethereum' },
  { slug: 'mnee-eth', title: 'MNEE Hackathon: Programmable Money', ecosystem: 'ethereum' },
  { slug: 'octopushack', title: 'Octopus Hackathon', ecosystem: 'near' },
  { slug: 'hacknomics', title: 'HackNomics', ecosystem: 'ethereum' },
  { slug: 'hackonchain', title: 'HackOnChain', ecosystem: 'ethereum' },
  { slug: 'web3hackathonpr', title: 'Web3 Hackathon Puerto Rico', ecosystem: 'ethereum' },
]

// ─── Devpost: scrape gallery & project details ───────────────────────────────

function curl(url) {
  try {
    return execSync(
      `curl -sL --max-time 15 --noproxy '*' "${url}" -H "User-Agent: ${UA}" -H "Accept: text/html"`,
      { timeout: 20000, maxBuffer: 5 * 1024 * 1024 },
    ).toString()
  } catch { return '' }
}

function scrapeGallery(hackathon) {
  const projects = []
  for (let page = 1; page <= 2; page++) {
    const html = curl(`https://${hackathon.slug}.devpost.com/project-gallery?page=${page}`)
    if (!html || html.length < 200) break
    const pat = /href="(https:\/\/devpost\.com\/software\/([^"]+))"/g
    let m
    const found = new Set()
    while ((m = pat.exec(html)) !== null) {
      if (!found.has(m[2])) {
        found.add(m[2])
        projects.push({ url: m[1], slug: m[2], hackathon })
      }
    }
    if (found.size < 8) break
  }
  return projects
}

function scrapeProject(p) {
  const html = curl(p.url)
  if (!html || html.length < 500) return null

  const get = (pat) => { const m = html.match(pat); return m ? m[1].trim() : '' }

  const name =
    get(/<h1[^>]*id="app-title"[^>]*>([^<]+)/) ||
    get(/property="og:title"\s+content="([^"]+)"/) ||
    get(/<title>([^|<]+)/)

  const tagline = get(/<p[^>]*class="[^"]*tagline[^"]*"[^>]*>([^<]+)/) ||
    get(/property="og:description"\s+content="([^"]+)"/)

  const builtWith = []
  const tp = /class="cp-tag"[^>]*>([^<]+)/g; let tm
  while ((tm = tp.exec(html)) !== null) builtWith.push(tm[1].trim().toLowerCase())

  const prizes = []
  const pp = /class="(?:winner-title|prize-title)"[^>]*>([^<]+)/g; let pm
  while ((pm = pp.exec(html)) !== null) prizes.push(pm[1].trim())
  const isWinner = prizes.length > 0 || /1st place|grand prize|winner|🏆/i.test(html)

  // Description
  let description = ''
  const dm = html.match(/id="app-details-left"[^>]*>([\s\S]*?)<\/section>/)
  if (dm) description = dm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500)

  return { name, tagline, builtWith, prizes, isWinner, description }
}

// ─── GitHub Search ────────────────────────────────────────────────────────────

const GH_QUERIES = [
  'hackathon winner ethereum',
  'hackathon winner web3',
  'hackathon winner defi',
  'hackathon winner solana',
  'hackathon winner blockchain',
  'ETHGlobal winner',
  'chainlink hackathon winner',
  'polygon hackathon winner',
  'near hackathon winner',
  'avalanche hackathon winner',
  'gitcoin hackathon winner',
  'hackathon first place defi',
  'hackathon prize solana',
  'web3 buildathon winner',
  'ETHDenver winner',
]

async function searchGitHub() {
  console.log('\n2. Searching GitHub for hackathon winner repos...')
  const repos = new Map()

  for (const q of GH_QUERIES) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=30`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
      if (res.status === 403) {
        console.log(`   Rate limited, waiting 60s...`)
        await sleep(60000)
        continue
      }
      if (!res.ok) continue
      const data = await res.json()
      for (const r of data.items || []) {
        if (!repos.has(r.full_name) && r.stargazers_count >= 1) {
          repos.set(r.full_name, {
            name: r.name,
            full_name: r.full_name,
            description: r.description || '',
            stars: r.stargazers_count,
            language: r.language || '',
            topics: r.topics || [],
            url: r.html_url,
          })
        }
      }
      console.log(`   [${q}]: total ${repos.size}`)
    } catch (e) {
      console.log(`   [${q}]: error ${e.message}`)
    }
    await sleep(2000)
  }

  console.log(`   GitHub total: ${repos.size} unique repos`)
  return [...repos.values()]
}

// ─── Skill generation ────────────────────────────────────────────────────────

function detectEcosystem(text, defaultEco = 'ethereum') {
  const t = text.toLowerCase()
  if (t.includes('solana') || t.includes('anchor') || t.includes('spl-token')) return 'solana'
  if (t.includes('polygon') || t.includes('matic')) return 'polygon'
  if (t.includes('arbitrum')) return 'arbitrum'
  if (t.includes('optimism') || t.includes('op mainnet')) return 'optimism'
  if (t.includes('base network') || t.includes('base chain')) return 'base'
  if (t.includes('avalanche') || t.includes('avax')) return 'avalanche'
  if (t.includes('near protocol') || t.includes('near blockchain')) return 'near'
  if (t.includes('sui move') || t.includes('sui network')) return 'sui'
  if (t.includes('aptos') || t.includes('move language')) return 'aptos'
  if (t.includes('polkadot') || t.includes('substrate')) return 'polkadot'
  return defaultEco
}

function detectCategory(text) {
  const t = text.toLowerCase()
  if (t.includes('defi') || t.includes('dex') || t.includes('lending') || t.includes('yield') || t.includes('amm')) return 'DeFi'
  if (t.includes(' nft') || t.includes('erc-721') || t.includes('erc721') || t.includes('collectible')) return 'NFT'
  if (t.includes(' dao ') || t.includes('governance') || t.includes('voting')) return 'DAO/Governance'
  if (t.includes(' ai ') || t.includes('llm') || t.includes('agent') || t.includes('machine learning')) return 'AI x Web3'
  if (t.includes('privacy') || t.includes('zero-knowledge') || t.includes(' zk ') || t.includes('zkp')) return 'Privacy/ZK'
  if (t.includes('game') || t.includes('gaming') || t.includes('play-to-earn') || t.includes('p2e')) return 'Gaming'
  if (t.includes('bridge') || t.includes('cross-chain') || t.includes('interop')) return 'Cross-chain'
  if (t.includes('social') || t.includes('identity') || t.includes('soulbound')) return 'Social/Identity'
  if (t.includes('payment') || t.includes('wallet') || t.includes('subscription')) return 'Payments'
  if (t.includes('insurance') || t.includes('rwa') || t.includes('real world')) return 'RWA/Insurance'
  return 'General Web3'
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

function buildDevpostSkill(proj, detail) {
  const allText = `${proj.hackathon.title} ${detail.name} ${detail.tagline} ${detail.description} ${detail.builtWith.join(' ')}`
  const ecosystem = detectEcosystem(allText, proj.hackathon.ecosystem)
  const category = detectCategory(allText)
  const id = `hackathon/${slugify(detail.name || proj.slug)}`

  const tech = detail.builtWith.length > 0 ? detail.builtWith.slice(0, 8).join(', ') : 'Not listed'
  const prizeText = detail.prizes.length > 0
    ? detail.prizes.map((p) => `- 🏆 ${p}`).join('\n')
    : detail.isWinner ? '- 🏆 Winner (category not specified)' : '- Submitted project'

  const content = `# ${detail.name || proj.slug}

## Hackathon Context
- **Event:** ${proj.hackathon.title}
- **Category:** ${category}
- **Ecosystem:** ${ecosystem}
- **Source:** [Devpost](${proj.url})

## Tagline
${detail.tagline || 'N/A'}

## Prizes
${prizeText}

## Tech Stack
${tech}

## Project Description
${detail.description || 'See project page for details.'}

## Winning Patterns Analysis

### Why This Project Won
1. **Clear problem statement** — ${category} problems have well-understood demand
2. **Working demo** — judges consistently favor shipped over pitched
3. **Tech depth** — ${tech.split(',')[0]} chosen for good fit with the problem
${detail.prizes.length > 0 ? `4. **Multi-track strategy** — targeted ${detail.prizes.length} sponsor track(s)` : ''}

### Reusable Patterns
- ${category} is a proven winning vertical at Web3 hackathons
- Stack simplicity wins: ${tech.split(',').slice(0, 3).join(', ')} covers most Web3 hackathon needs
- Sponsor integration > generic implementation — use the sponsor's SDK meaningfully
- 24-48h scope discipline: 1 core feature done > 5 features half-built

## For Future Participants
**Trigger:** When building a ${category} project at a Web3 hackathon, reference this pattern.
- Ecosystem: ${ecosystem}
- Winning tech stack elements: ${tech}
- Pitch angle: ${detail.tagline || 'Focus on user impact + technical depth'}
`

  return {
    id,
    name: `[Hackathon] ${detail.name || proj.slug} (${proj.hackathon.title})`,
    ecosystem,
    type: 'hackathon-case',
    time_sensitivity: 'evergreen',
    source: 'community',
    confidence: detail.prizes.length > 0 ? 'high' : 'medium',
    version: '1.0.0',
    content,
    tags: ['hackathon', category.toLowerCase().replace(/[^a-z]/g, '-'), ecosystem,
           ...detail.builtWith.slice(0, 4),
           detail.isWinner ? 'winner' : 'participant'].filter(Boolean),
  }
}

function buildGitHubSkill(repo) {
  const allText = `${repo.name} ${repo.description} ${repo.topics.join(' ')}`
  const ecosystem = detectEcosystem(allText)
  const category = detectCategory(allText)
  const id = `hackathon/${slugify(repo.name)}`

  const content = `# ${repo.name}

## Repository
- **GitHub:** [${repo.full_name}](${repo.url})
- **Category:** ${category}
- **Ecosystem:** ${ecosystem}
- **Stars:** ⭐ ${repo.stars}
- **Language:** ${repo.language || 'Multiple'}
- **Topics:** ${repo.topics.join(', ') || 'N/A'}

## Description
${repo.description || 'Open-source hackathon project.'}

## Winning Patterns Analysis

### Why This Project Stands Out
1. **Community validation:** ${repo.stars} GitHub stars post-hackathon shows real interest
2. **Open source:** Published code increases credibility and ecosystem contribution
3. **${category} focus:** Strong vertical with clear market demand
4. **${repo.language || 'Multi-language'} stack:** Accessible to most Web3 devs

### Reusable Patterns
- Open-sourcing your hackathon project creates lasting portfolio value
- ${category} projects attract ongoing contributors
- Topics like ${repo.topics.slice(0, 3).join(', ') || ecosystem} signal good discoverability
- Star count trajectory matters — good README + demo = post-hackathon traction

## For Future Participants
**Trigger:** When looking for ${category} hackathon inspiration in ${ecosystem} ecosystem.
- Study this repo's approach and architecture
- Fork pattern: ${repo.language || 'TypeScript/Solidity'} stack for ${category}
`

  return {
    id,
    name: `[Hackathon Repo] ${repo.name}`,
    ecosystem,
    type: 'hackathon-case',
    time_sensitivity: 'evergreen',
    source: 'community',
    confidence: repo.stars >= 20 ? 'high' : 'medium',
    version: '1.0.0',
    content,
    tags: ['hackathon', 'github', 'open-source',
           category.toLowerCase().replace(/[^a-z]/g, '-'),
           ecosystem, repo.language?.toLowerCase(),
           ...repo.topics.slice(0, 3)].filter(Boolean),
  }
}

// ─── Supabase write ───────────────────────────────────────────────────────────

async function upsert(skill) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  return res.ok
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Hackathon Case Study Import v3 ===\n')

  const skills = []
  const seen = new Set()

  // ── Phase 1: Devpost gallery scraping ──
  console.log(`1. Scraping ${KNOWN_HACKATHONS.length} Devpost hackathons...`)
  let devpostCount = 0

  for (const hackathon of KNOWN_HACKATHONS) {
    const projects = scrapeGallery(hackathon)
    if (projects.length === 0) {
      console.log(`   ${hackathon.slug}: no projects (blocked or empty)`)
      continue
    }

    // Detail up to 5 projects per hackathon
    let added = 0
    for (const proj of projects.slice(0, 5)) {
      const detail = scrapeProject(proj)
      if (!detail?.name) continue
      const skill = buildDevpostSkill(proj, detail)
      if (!seen.has(skill.id)) {
        seen.add(skill.id)
        skills.push(skill)
        added++
        devpostCount++
      }
    }
    console.log(`   ${hackathon.slug}: ${projects.length} projects → ${added} skills`)
  }

  console.log(`   Devpost total: ${devpostCount} skills`)

  // ── Phase 2: GitHub ──
  const repos = await searchGitHub()

  for (const repo of repos.slice(0, 60)) {
    const skill = buildGitHubSkill(repo)
    if (!seen.has(skill.id)) {
      seen.add(skill.id)
      skills.push(skill)
    }
  }

  console.log(`\n3. Total skills: ${skills.length} (${devpostCount} Devpost + ${skills.length - devpostCount} GitHub)`)

  // ── Phase 3: Write to Supabase ──
  console.log('\n4. Writing to Supabase...')
  let written = 0, failed = 0

  for (const skill of skills) {
    const ok = await upsert(skill)
    if (ok) {
      written++
      console.log(`   ✓ ${skill.id}`)
    } else {
      failed++
      console.log(`   ✗ ${skill.id} FAILED`)
    }
    await sleep(80)
  }

  console.log(`\n=== DONE ===`)
  console.log(`Written: ${written} | Failed: ${failed} | Total: ${skills.length}`)

  // Check final DB count
  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills?type=eq.hackathon-case&select=id`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  const all = await res.json()
  console.log(`DB hackathon-case total: ${all.length}`)
}

main().catch(console.error)
