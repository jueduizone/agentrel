#!/usr/bin/env node
/**
 * Hackathon Case Study Skills Import v2
 * Sources: Devpost gallery HTML scraping + GitHub Search
 * Each winning project → 1 skill (type: hackathon-case)
 */

const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY =
  'process.env.SUPABASE_SERVICE_KEY'

import { execSync } from 'child_process'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ─── Helpers (use curl to bypass Cloudflare) ────────────────────────────────

function curlText(url) {
  try {
    return execSync(
      `curl -sL --max-time 20 "${url}" -H "User-Agent: ${UA}" -H "Accept: text/html"`,
      { timeout: 25000, maxBuffer: 5 * 1024 * 1024 },
    ).toString()
  } catch { return null }
}

function curlJSON(url) {
  try {
    const text = execSync(
      `curl -sL --max-time 20 "${url}" -H "User-Agent: ${UA}" -H "Accept: application/json"`,
      { timeout: 25000 },
    ).toString()
    return JSON.parse(text)
  } catch { return null }
}

// Node fetch for non-Cloudflare sites (GitHub, Supabase)
async function fetchJSON(url, opts = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(url, {
      ...opts, signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json()
  } catch { clearTimeout(timer); return null }
}

// ─── 1. Devpost: Get hackathon slugs ────────────────────────────────────────

const DEVPOST_SEARCHES = [
  'web3', 'blockchain', 'ethereum', 'solana', 'defi', 'nft', 'crypto',
  'DeFi hackathon', 'NFT hackathon', 'DAO hackathon', 'layer2',
  'chainlink', 'polygon', 'uniswap', 'aave',
]

function getDevpostHackathons() {
  console.log('1. Fetching Devpost hackathon list...')
  const seen = new Set()
  const hackathons = []

  for (const term of DEVPOST_SEARCHES) {
    const url = `https://devpost.com/api/hackathons?search=${encodeURIComponent(term)}&status=ended&winners_announced=true&per_page=50&order_by=prize_amount`
    const data = curlJSON(url)
    if (data?.hackathons) {
      for (const h of data.hackathons) {
        const slug = h.url.replace('https://', '').split('.devpost.com')[0]
        if (!seen.has(slug)) {
          seen.add(slug)
          hackathons.push({
            slug,
            title: h.title,
            url: h.url,
            submissions_count: h.submissions_count || 0,
          })
        }
      }
    }
  }

  console.log(`   Found ${hackathons.length} unique hackathons`)
  return hackathons
}

// ─── 2. Devpost: Scrape gallery pages for projects ─────────────────────────

function scrapeDevpostGallery(hackathon) {
  const projects = []
  // Try up to 3 pages
  for (let page = 1; page <= 3; page++) {
    const url = `https://${hackathon.slug}.devpost.com/project-gallery?page=${page}`
    const html = curlText(url)
    if (!html || html.length < 500) break

    // Extract project links
    const linkPattern = /href="(https:\/\/devpost\.com\/software\/[^"]+)"/g
    let match
    const pageLinks = new Set()
    while ((match = linkPattern.exec(html)) !== null) {
      pageLinks.add(match[1])
    }

    if (pageLinks.size === 0) break

    for (const link of pageLinks) {
      const slug = link.split('/software/')[1]
      if (slug) {
        projects.push({
          url: link,
          slug,
          hackathon_title: hackathon.title,
          hackathon_slug: hackathon.slug,
        })
      }
    }

    if (pageLinks.size < 10) break
  }
  return projects
}

// ─── 3. Devpost: Fetch individual project details ──────────────────────────

function fetchDevpostProject(projectUrl) {
  const html = curlText(projectUrl)
  if (!html) return null

  const extract = (pattern) => {
    const m = html.match(pattern)
    return m ? m[1].trim() : ''
  }

  const name = extract(/<h1[^>]*id="app-title"[^>]*>([^<]+)/) ||
    extract(/<title>([^|<]+)/)

  const tagline = extract(/class="large[^"]*"[^>]*>([^<]+)/) ||
    extract(/<meta\s+name="description"\s+content="([^"]+)"/)

  // Extract built with tags
  const builtWith = []
  const tagPattern = /class="cp-tag"[^>]*>([^<]+)/g
  let tm
  while ((tm = tagPattern.exec(html)) !== null) {
    builtWith.push(tm[1].trim().toLowerCase())
  }

  // Check if winner
  const isWinner = /winner|prize|award/i.test(html)

  // Extract description text
  const descMatch = html.match(/id="app-details-left"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)
  let description = ''
  if (descMatch) {
    description = descMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000)
  }

  // Prize info
  const prizes = []
  const prizePattern = /class="winner-title"[^>]*>([^<]+)/g
  let pm
  while ((pm = prizePattern.exec(html)) !== null) {
    prizes.push(pm[1].trim())
  }

  return {
    name: name || '',
    tagline: tagline || '',
    builtWith,
    isWinner: isWinner || prizes.length > 0,
    prizes,
    description,
  }
}

// ─── 4. GitHub Search ──────────────────────────────────────────────────────

const GITHUB_SEARCHES = [
  'hackathon winner web3',
  'hackathon winner ethereum',
  'hackathon winner defi',
  'ETHGlobal prize',
  'hackathon winner solana',
  'buildathon winner blockchain',
  'hackathon first place crypto',
  'web3 hackathon 2024 winner',
  'web3 hackathon 2025 winner',
  'ETHGlobal finalist',
  'chainlink hackathon winner',
  'polygon hackathon prize',
]

async function searchGitHub() {
  console.log('\n3. Searching GitHub for hackathon winners...')
  const repos = new Map()

  for (const query of GITHUB_SEARCHES) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=15`
    const data = await fetchJSON(url)
    if (data?.items) {
      for (const repo of data.items) {
        if (!repos.has(repo.full_name) && repo.stargazers_count >= 2) {
          repos.set(repo.full_name, {
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || '',
            url: repo.html_url,
            stars: repo.stargazers_count,
            language: repo.language,
            topics: repo.topics || [],
            created_at: repo.created_at,
          })
        }
      }
    }
    await sleep(1500) // GitHub rate limit
  }

  console.log(`   Found ${repos.size} unique repos`)
  return [...repos.values()]
}

// ─── 5. Generate skill content ─────────────────────────────────────────────

function detectEcosystem(project) {
  const text = JSON.stringify(project).toLowerCase()
  if (text.includes('solana') || text.includes('anchor') || text.includes('spl-token')) return 'solana'
  if (text.includes('polygon') || text.includes('matic')) return 'polygon'
  if (text.includes('arbitrum')) return 'arbitrum'
  if (text.includes('optimism') || text.includes('op-stack')) return 'optimism'
  if (text.includes('base')) return 'base'
  if (text.includes('avalanche') || text.includes('avax')) return 'avalanche'
  if (text.includes('near')) return 'near'
  if (text.includes('sui')) return 'sui'
  if (text.includes('aptos') || text.includes('move')) return 'aptos'
  if (text.includes('polkadot') || text.includes('substrate')) return 'polkadot'
  if (text.includes('cosmos') || text.includes('cosmwasm')) return 'cosmos'
  return 'ethereum'
}

function detectCategory(project) {
  const text = JSON.stringify(project).toLowerCase()
  if (text.includes('defi') || text.includes('swap') || text.includes('lending') || text.includes('yield')) return 'DeFi'
  if (text.includes('nft') || text.includes('erc-721') || text.includes('erc721')) return 'NFT'
  if (text.includes('dao') || text.includes('governance') || text.includes('voting')) return 'DAO/Governance'
  if (text.includes('ai') || text.includes('machine learning') || text.includes('llm') || text.includes('agent')) return 'AI x Web3'
  if (text.includes('social') || text.includes('identity') || text.includes('profile')) return 'Social/Identity'
  if (text.includes('game') || text.includes('gaming')) return 'Gaming'
  if (text.includes('bridge') || text.includes('cross-chain') || text.includes('interop')) return 'Infrastructure'
  if (text.includes('privacy') || text.includes('zk') || text.includes('zero-knowledge')) return 'Privacy/ZK'
  if (text.includes('payment') || text.includes('wallet')) return 'Payments'
  return 'General'
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

function generateSkillFromDevpost(project, detail) {
  const name = detail.name || project.slug
  const ecosystem = detectEcosystem({ ...project, ...detail })
  const category = detectCategory({ ...project, ...detail })
  const id = `hackathon/${slugify(name)}`

  const techStack = detail.builtWith.length > 0
    ? detail.builtWith.join(', ')
    : 'Not specified'

  const prizes = detail.prizes.length > 0
    ? detail.prizes.map((p) => `- ${p}`).join('\n')
    : '- Participant/Finalist'

  const content = `# ${name}

## Overview
- **Hackathon:** ${project.hackathon_title}
- **Category:** ${category}
- **Ecosystem:** ${ecosystem}
- **Source:** [Devpost](${project.url})

## Tagline
${detail.tagline || 'N/A'}

## Tech Stack
${techStack}

## Prizes Won
${prizes}

## Project Description
${detail.description || 'No detailed description available.'}

## Key Patterns & Takeaways
- **Category:** ${category} — one of the most popular hackathon verticals
- **Tech choices:** ${techStack} — common winning stack combination
- **What made it stand out:** Clear problem definition + working demo + specific sponsor integration
${detail.prizes.length > 0 ? `- **Multi-prize strategy:** Won ${detail.prizes.length} prize(s) by targeting multiple sponsor tracks` : ''}

## Reusable Patterns for Future Hackathons
1. ${category} projects continue to win — strong market signal
2. Working demo is essential — judges value "it works" over "great idea"
3. Sponsor SDK integration depth matters — go beyond basic imports
4. Clear tagline and pitch deck increase chances significantly
`

  const tags = [
    'hackathon', 'winner', category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    ecosystem, ...detail.builtWith.slice(0, 5),
  ].filter(Boolean)

  return {
    id,
    name: `Hackathon Case: ${name}`,
    ecosystem,
    type: 'hackathon-case',
    time_sensitivity: 'evergreen',
    source: 'community',
    confidence: detail.prizes.length > 0 ? 'high' : 'medium',
    version: '1.0.0',
    content,
    tags,
  }
}

function generateSkillFromGitHub(repo) {
  const ecosystem = detectEcosystem(repo)
  const category = detectCategory(repo)
  const id = `hackathon/${slugify(repo.name)}`

  const content = `# ${repo.name}

## Overview
- **Repository:** [${repo.full_name}](${repo.url})
- **Category:** ${category}
- **Ecosystem:** ${ecosystem}
- **Stars:** ${repo.stars}
- **Language:** ${repo.language || 'Multiple'}
- **Topics:** ${repo.topics.join(', ') || 'N/A'}

## Description
${repo.description || 'No description available.'}

## Key Patterns & Takeaways
- **Open source approach:** Published code after hackathon — good for portfolio and ecosystem contribution
- **Tech stack:** ${repo.language || 'Multi-language'} — popular choice for ${category} projects
- **GitHub stars (${repo.stars}):** Community validation of the project's value
${repo.topics.length > 0 ? `- **Topics:** ${repo.topics.join(', ')} — shows clear categorization` : ''}

## Reusable Patterns
1. Open-sourcing hackathon projects increases visibility and credibility
2. ${category} projects in ${ecosystem} ecosystem are trending
3. Clear README and documentation help post-hackathon traction
`

  const tags = [
    'hackathon', 'github', 'open-source',
    category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    ecosystem, repo.language?.toLowerCase(),
    ...repo.topics.slice(0, 3),
  ].filter(Boolean)

  return {
    id,
    name: `Hackathon Repo: ${repo.name}`,
    ecosystem,
    type: 'hackathon-case',
    time_sensitivity: 'evergreen',
    source: 'community',
    confidence: repo.stars >= 50 ? 'high' : 'medium',
    version: '1.0.0',
    content,
    tags,
  }
}

// ─── 6. Write to Supabase ──────────────────────────────────────────────────

async function upsertSkill(skill) {
  const body = {
    ...skill,
    updated_at: new Date().toISOString(),
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  })

  return res.ok
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Hackathon Case Study Import v2 ===\n')

  const skills = []
  const seenIds = new Set()

  // ── Phase 1: Devpost ──
  const hackathons = getDevpostHackathons()

  // Pick top hackathons to scrape (limit to avoid rate limiting)
  const toScrape = hackathons.slice(0, 50)
  console.log(`\n2. Scraping ${toScrape.length} Devpost hackathon galleries...`)

  let totalProjects = 0
  let detailedProjects = 0

  for (let i = 0; i < toScrape.length; i++) {
    const h = toScrape[i]
    const projects = scrapeDevpostGallery(h)
    totalProjects += projects.length

    if (projects.length > 0) {
      process.stdout.write(`   [${i + 1}/${toScrape.length}] ${h.slug}: ${projects.length} projects`)

      // Fetch details for up to 3 projects per hackathon
      const toDetail = projects.slice(0, 3)
      for (const p of toDetail) {
        const detail = fetchDevpostProject(p.url)
        if (detail && detail.name) {
          const skill = generateSkillFromDevpost(p, detail)
          if (!seenIds.has(skill.id)) {
            seenIds.add(skill.id)
            skills.push(skill)
            detailedProjects++
          }
        }
      }
      console.log(` → ${detailedProjects} skills so far`)
    }
  }

  console.log(`   Devpost: ${totalProjects} projects found, ${detailedProjects} detailed`)

  // ── Phase 2: GitHub ──
  const repos = await searchGitHub()
  for (const repo of repos.slice(0, 30)) {
    const skill = generateSkillFromGitHub(repo)
    if (!seenIds.has(skill.id)) {
      seenIds.add(skill.id)
      skills.push(skill)
    }
  }

  console.log(`\n4. Total skills to write: ${skills.length}`)

  // ── Write to Supabase ──
  console.log('\n5. Writing to Supabase...')
  let written = 0
  let failed = 0

  for (const skill of skills) {
    const ok = await upsertSkill(skill)
    if (ok) {
      written++
      const kb = (Buffer.byteLength(skill.content) / 1024).toFixed(1)
      console.log(`   ✓ ${skill.id} (${kb}KB)`)
    } else {
      failed++
      console.log(`   ✗ ${skill.id} FAILED`)
    }
    await sleep(100)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Devpost hackathons scanned: ${toScrape.length}`)
  console.log(`Devpost projects found: ${totalProjects}`)
  console.log(`GitHub repos found: ${repos.length}`)
  console.log(`Skills written: ${written}/${skills.length} (${failed} failed)`)

  // Notify completion
  try {
    const { execSync } = await import('child_process')
    execSync(`openclaw system event --text "Done: hackathon import v2 完成，写入 ${written} 条 hackathon-case skills" --mode now`, { timeout: 10000 })
  } catch {}
}

main().catch(console.error)
