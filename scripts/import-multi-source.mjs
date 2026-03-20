#!/usr/bin/env node
/**
 * AgentRel Skills Import: DeFiLlama TVL + Raises + npm Trends + Code4rena
 * Writes skills of types: defi-protocol, fundraising, dev-tooling, security-vuln
 */

const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_KEY'
const GH_TOKEN = 'process.env.GITHUB_TOKEN'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'AgentRel/1.0', Accept: 'application/json', ...headers } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function upsert(skill) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/skills`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  return r.ok
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

// ─── 1. DeFiLlama: Top protocols by TVL per category ─────────────────────────
async function importDefiLlama() {
  console.log('\n[1] DeFiLlama protocols...')
  const protocols = await get('https://api.llama.fi/protocols')
  if (!protocols) return 0

  // Group by category, take top 5 by TVL each
  const byCat = {}
  for (const p of protocols) {
    if (!p.category || !p.tvl || p.tvl < 1e6) continue
    if (!byCat[p.category]) byCat[p.category] = []
    byCat[p.category].push(p)
  }

  const skills = []
  for (const [cat, protos] of Object.entries(byCat)) {
    const top = protos.sort((a, b) => b.tvl - a.tvl).slice(0, 8)
    if (top.length < 2) continue

    const rows = top.map(p =>
      `| ${p.name} | $${(p.tvl / 1e6).toFixed(1)}M | ${(p.change_7d || 0).toFixed(1)}% | ${p.chains?.slice(0, 3).join(', ') || p.chain} |`
    ).join('\n')

    const ecosystems = [...new Set(top.flatMap(p => p.chains || [p.chain]).filter(Boolean))].slice(0, 5)
    const totalTvl = top.reduce((s, p) => s + p.tvl, 0)

    const content = `# DeFi Category Analysis: ${cat}

## Market Overview
- **Category:** ${cat}
- **Top Protocols:** ${top.length} analyzed
- **Combined TVL:** $${(totalTvl / 1e9).toFixed(2)}B
- **Active Chains:** ${ecosystems.join(', ')}
- **Data Source:** DeFiLlama (live)

## Top Protocols by TVL

| Protocol | TVL | 7d Change | Chains |
|----------|-----|-----------|--------|
${rows}

## Key Insights for Developers

### Why Build in ${cat}?
${totalTvl > 1e9 ? `- **Massive market:** $${(totalTvl / 1e9).toFixed(1)}B+ TVL validates product-market fit` : `- **Growing niche:** $${(totalTvl / 1e6).toFixed(0)}M TVL with room for new entrants`}
- ${top.length} competing protocols means room for differentiation
- Leading protocol: **${top[0].name}** at $${(top[0].tvl / 1e6).toFixed(0)}M TVL

### Technical Patterns
- Dominant chains: ${ecosystems.slice(0, 3).join(', ')}
- Multi-chain presence is common among top protocols
- Integration with top protocols (${top.slice(0, 3).map(p => p.name).join(', ')}) can accelerate adoption

### Competitive Landscape
${top.slice(0, 5).map((p, i) => `${i + 1}. **${p.name}** — $${(p.tvl / 1e6).toFixed(0)}M TVL, ${(p.change_7d || 0).toFixed(1)}% 7d`).join('\n')}

## For Hackathon & Grant Projects
- Building in **${cat}** aligns with proven demand
- Consider integrating/composing with ${top[0].name} or ${top[1]?.name || 'leading protocols'}
- Chain focus: start with ${ecosystems[0]}, expand from there
`
    skills.push({
      id: `defi/category-${slugify(cat)}`,
      name: `DeFi Landscape: ${cat}`,
      ecosystem: ecosystems[0]?.toLowerCase() || 'ethereum',
      type: 'defi-protocol',
      time_sensitivity: 'short-lived',
      source: 'defillama',
      confidence: 'high',
      version: '1.0.0',
      content,
      tags: ['defi', slugify(cat), 'tvl', 'market-data', 'defillama'],
    })
  }

  // Also: top protocols overall
  const top20 = protocols.filter(p => p.tvl > 1e8).sort((a, b) => b.tvl - a.tvl).slice(0, 20)
  const overallContent = `# DeFi Top 20 Protocols by TVL

## Current Landscape
- **Total analyzed:** ${protocols.length} protocols
- **Data Source:** DeFiLlama

## Top 20 Protocols

| Rank | Protocol | Category | TVL | 7d |
|------|----------|----------|-----|----|
${top20.map((p, i) => `| ${i + 1} | ${p.name} | ${p.category} | $${(p.tvl / 1e9).toFixed(2)}B | ${(p.change_7d || 0).toFixed(1)}% |`).join('\n')}

## Insights
- Top category by protocol count: ${Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)[0][0]}
- Most TVL: **${top20[0].name}** ($${(top20[0].tvl / 1e9).toFixed(1)}B)
- 7d gainers: ${top20.filter(p => (p.change_7d || 0) > 5).map(p => p.name).slice(0, 3).join(', ') || 'N/A'}
`
  skills.push({
    id: 'defi/top-protocols-overview',
    name: 'DeFi Top Protocols Overview',
    ecosystem: 'multi-chain',
    type: 'defi-protocol',
    time_sensitivity: 'short-lived',
    source: 'defillama',
    confidence: 'high',
    version: '1.0.0',
    content: overallContent,
    tags: ['defi', 'tvl', 'overview', 'defillama', 'market-data'],
  })

  let written = 0
  for (const s of skills) {
    if (await upsert(s)) { written++; process.stdout.write('.') }
    await sleep(80)
  }
  console.log(`\n   Written: ${written}/${skills.length}`)
  return written
}

// ─── 2. DeFiLlama Raises ──────────────────────────────────────────────────────
async function importRaises() {
  console.log('\n[2] DeFiLlama raises...')
  const data = await get('https://api.llama.fi/raises')
  if (!data?.raises) return 0

  const raises = data.raises.filter(r => r.amount > 0)

  // Group by category
  const byCat = {}
  for (const r of raises) {
    const cat = r.category || r.categoryGroup || 'Other'
    if (!byCat[cat]) byCat[cat] = []
    byCat[cat].push(r)
  }

  // Round analysis
  const byRound = {}
  for (const r of raises) {
    const round = r.round || 'Unknown'
    if (!byRound[round]) byRound[round] = { count: 0, total: 0 }
    byRound[round].count++
    byRound[round].total += r.amount || 0
  }

  const skills = []

  // Overall fundraising landscape
  const recent = raises.filter(r => r.date > Date.now() / 1000 - 90 * 86400)
    .sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 20)

  const totalRecent = recent.reduce((s, r) => s + (r.amount || 0), 0)
  const overallContent = `# Web3 Fundraising Landscape (Last 90 Days)

## Overview
- **Total raises in DB:** ${raises.length.toLocaleString()}
- **Recent (90d) raises:** ${recent.length}
- **Recent total raised:** $${totalRecent.toFixed(0)}M
- **Data Source:** DeFiLlama

## Top Recent Raises

| Project | Round | Amount | Category | Lead Investors |
|---------|-------|--------|----------|----------------|
${recent.slice(0, 15).map(r =>
  `| ${r.name} | ${r.round || '?'} | $${(r.amount || 0).toFixed(1)}M | ${r.category || r.categoryGroup || '?'} | ${(r.leadInvestors || []).slice(0, 2).join(', ') || '-'} |`
).join('\n')}

## By Round Type
${Object.entries(byRound).sort((a, b) => b[1].total - a[1].total).slice(0, 10).map(([round, d]) =>
  `- **${round}:** ${d.count} deals, $${d.total.toFixed(0)}M total`
).join('\n')}

## Insights for Founders
- Most active funding stage: **${Object.entries(byRound).sort((a,b) => b[1].count - a[1].count)[0][0]}**
- Seed/Pre-seed is accessible — average deal size matters
- Top categories attracting capital: ${Object.entries(byCat).sort((a, b) => b[1].length - a[1].length).slice(0, 5).map(([c]) => c).join(', ')}
`
  skills.push({
    id: 'fundraising/web3-landscape-overview',
    name: 'Web3 Fundraising Landscape Overview',
    ecosystem: 'multi-chain',
    type: 'fundraising',
    time_sensitivity: 'short-lived',
    source: 'defillama',
    confidence: 'high',
    version: '1.0.0',
    content: overallContent,
    tags: ['fundraising', 'vc', 'investment', 'defillama', 'market-data'],
  })

  // Per category fundraising
  for (const [cat, catRaises] of Object.entries(byCat)) {
    if (catRaises.length < 5) continue
    const sorted = catRaises.sort((a, b) => (b.amount || 0) - (a.amount || 0))
    const total = catRaises.reduce((s, r) => s + (r.amount || 0), 0)
    const topDeals = sorted.slice(0, 10)

    const content = `# Web3 Fundraising: ${cat}

## Category Stats
- **Total raises:** ${catRaises.length}
- **Total raised:** $${total.toFixed(0)}M
- **Average deal:** $${(total / catRaises.length).toFixed(1)}M
- **Largest deal:** $${(topDeals[0]?.amount || 0).toFixed(0)}M (${topDeals[0]?.name || '?'})

## Top Deals

| Project | Round | Amount | Lead Investors |
|---------|-------|--------|----------------|
${topDeals.map(r =>
  `| ${r.name} | ${r.round || '?'} | $${(r.amount || 0).toFixed(1)}M | ${(r.leadInvestors || []).slice(0, 2).join(', ') || '-'} |`
).join('\n')}

## Key Investors in ${cat}
${[...new Set(catRaises.flatMap(r => r.leadInvestors || []))].slice(0, 10).map(v => `- ${v}`).join('\n') || '- Data not available'}

## Insights
- **${cat}** has raised $${total.toFixed(0)}M across ${catRaises.length} deals
- Average deal size $${(total / catRaises.length).toFixed(1)}M indicates ${total / catRaises.length > 10 ? 'growth/Series stage' : 'early stage'} funding
- Building in this category: expect investor interest from above list
`
    skills.push({
      id: `fundraising/category-${slugify(cat)}`,
      name: `Web3 Fundraising: ${cat}`,
      ecosystem: 'multi-chain',
      type: 'fundraising',
      time_sensitivity: 'short-lived',
      source: 'defillama',
      confidence: 'high',
      version: '1.0.0',
      content,
      tags: ['fundraising', 'vc', slugify(cat), 'investment', 'defillama'],
    })
  }

  let written = 0
  for (const s of skills) {
    if (await upsert(s)) { written++; process.stdout.write('.') }
    await sleep(80)
  }
  console.log(`\n   Written: ${written}/${skills.length}`)
  return written
}

// ─── 3. npm Dev Tool Trends ───────────────────────────────────────────────────
async function importNpmTrends() {
  console.log('\n[3] npm dev tool trends...')

  const packages = [
    // EVM
    { name: 'ethers', label: 'ethers.js', cat: 'evm-library' },
    { name: 'viem', label: 'viem', cat: 'evm-library' },
    { name: 'wagmi', label: 'wagmi', cat: 'react-hooks' },
    { name: '@wagmi/core', label: '@wagmi/core', cat: 'react-hooks' },
    { name: 'web3', label: 'web3.js', cat: 'evm-library' },
    { name: 'hardhat', label: 'Hardhat', cat: 'dev-framework' },
    { name: '@nomiclabs/hardhat-ethers', label: 'hardhat-ethers', cat: 'dev-framework' },
    { name: '@openzeppelin/contracts', label: 'OpenZeppelin Contracts', cat: 'security-library' },
    { name: 'typechain', label: 'TypeChain', cat: 'codegen' },
    { name: '@thirdweb-dev/sdk', label: 'thirdweb SDK', cat: 'sdk' },
    // Solana
    { name: '@solana/web3.js', label: '@solana/web3.js', cat: 'solana' },
    { name: '@project-serum/anchor', label: 'Anchor (Serum)', cat: 'solana' },
    { name: '@coral-xyz/anchor', label: 'Anchor (Coral)', cat: 'solana' },
    // Indexing/data
    { name: '@apollo/client', label: 'Apollo Client (for The Graph)', cat: 'data' },
    { name: 'graphql', label: 'GraphQL', cat: 'data' },
    // Wallets
    { name: '@rainbow-me/rainbowkit', label: 'RainbowKit', cat: 'wallet-ui' },
    { name: 'connectkit', label: 'ConnectKit', cat: 'wallet-ui' },
    { name: '@web3modal/wagmi', label: 'Web3Modal/wagmi', cat: 'wallet-ui' },
  ]

  const stats = []
  for (const pkg of packages) {
    const d = await get(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg.name)}`)
    if (d?.downloads) {
      stats.push({ ...pkg, monthly: d.downloads })
    }
    await sleep(200)
  }

  stats.sort((a, b) => b.monthly - a.monthly)

  // Group by category
  const byCat = {}
  for (const s of stats) {
    if (!byCat[s.cat]) byCat[s.cat] = []
    byCat[s.cat].push(s)
  }

  const skills = []

  // Overall overview
  const overviewContent = `# Web3 Developer Tooling: npm Download Trends

## Monthly Downloads (Last 30 Days)
| Package | Category | Monthly Downloads |
|---------|----------|------------------|
${stats.map(s => `| **${s.label}** | ${s.cat} | ${s.monthly.toLocaleString()} |`).join('\n')}

## Key Insights

### EVM Library War: viem vs ethers.js
- **viem:** ${stats.find(s => s.name === 'viem')?.monthly.toLocaleString() || 'N/A'} downloads/month
- **ethers.js:** ${stats.find(s => s.name === 'ethers')?.monthly.toLocaleString() || 'N/A'} downloads/month
- viem has overtaken ethers — new projects should default to viem

### Framework Choice
- **Hardhat** remains dominant for EVM dev: ${stats.find(s => s.name === 'hardhat')?.monthly.toLocaleString() || 'N/A'}/month
- Foundry not on npm (Rust-based) but growing fast in professional auditors/teams

### Wallet UX
- **RainbowKit:** ${stats.find(s => s.name === '@rainbow-me/rainbowkit')?.monthly.toLocaleString() || 'N/A'}/month
- **ConnectKit:** ${stats.find(s => s.name === 'connectkit')?.monthly.toLocaleString() || 'N/A'}/month

### Solana Ecosystem
- **@solana/web3.js:** ${stats.find(s => s.name === '@solana/web3.js')?.monthly.toLocaleString() || 'N/A'}/month
- **Anchor:** ${(stats.find(s => s.name === '@coral-xyz/anchor')?.monthly || 0 + (stats.find(s => s.name === '@project-serum/anchor')?.monthly || 0)).toLocaleString()}/month combined

## Recommendations for New Projects

### EVM stack (2025 standard):
\`\`\`
viem + wagmi + RainbowKit + Hardhat (or Foundry) + OpenZeppelin
\`\`\`

### Solana stack:
\`\`\`
@solana/web3.js + @coral-xyz/anchor
\`\`\`

### For hackathons (fast setup):
\`\`\`
thirdweb SDK (all-in-one, lowest friction)
\`\`\`
`

  skills.push({
    id: 'dev-tooling/npm-trends-overview',
    name: 'Web3 Dev Tooling: npm Download Trends',
    ecosystem: 'multi-chain',
    type: 'dev-tooling',
    time_sensitivity: 'short-lived',
    source: 'npm',
    confidence: 'high',
    version: '1.0.0',
    content: overviewContent,
    tags: ['dev-tooling', 'npm', 'viem', 'ethers', 'wagmi', 'hardhat', 'solana', 'trends'],
  })

  // Per-category skills
  for (const [cat, pkgs] of Object.entries(byCat)) {
    if (pkgs.length < 2) continue
    const winner = pkgs[0]
    const content = `# Web3 Dev Tooling: ${cat}

## Download Rankings (Last 30 Days)
${pkgs.map((p, i) => `${i + 1}. **${p.label}** — ${p.monthly.toLocaleString()} downloads/month`).join('\n')}

## Recommendation
Use **${winner.label}** — highest adoption, most community resources, best DX signals.

${pkgs.length > 1 ? `## Alternatives
${pkgs.slice(1).map(p => `- **${p.label}** (${p.monthly.toLocaleString()}/mo) — ${Math.round(p.monthly / winner.monthly * 100)}% of leader's adoption`).join('\n')}` : ''}
`
    skills.push({
      id: `dev-tooling/${slugify(cat)}`,
      name: `Web3 Dev Tooling: ${cat}`,
      ecosystem: 'multi-chain',
      type: 'dev-tooling',
      time_sensitivity: 'short-lived',
      source: 'npm',
      confidence: 'high',
      version: '1.0.0',
      content,
      tags: ['dev-tooling', 'npm', cat, ...pkgs.map(p => slugify(p.label)).slice(0, 3)],
    })
  }

  let written = 0
  for (const s of skills) {
    if (await upsert(s)) { written++; process.stdout.write('.') }
    await sleep(80)
  }
  console.log(`\n   Written: ${written}/${skills.length}`)
  return written
}

// ─── 4. Code4rena Security Findings ──────────────────────────────────────────
async function importCode4rena() {
  console.log('\n[4] Code4rena security findings...')

  // Get recent contest repos
  const ghHeaders = {
    Authorization: `token ${GH_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  }

  // Search for code4rena findings repos from 2024-2025
  const contests = []
  for (const year of ['2024', '2025']) {
    const data = await get(
      `https://api.github.com/search/repositories?q=org:code-423n4+${year}+findings&sort=updated&per_page=20`,
      ghHeaders
    )
    if (data?.items) {
      contests.push(...data.items.map(r => ({ name: r.name, full_name: r.full_name })))
    }
    await sleep(1500)
  }

  console.log(`   Found ${contests.length} contest repos`)

  const skillsMap = new Map()
  const vulnPatterns = new Map() // collect patterns across contests

  for (const contest of contests.slice(0, 15)) {
    // Get finding files
    const files = await get(
      `https://api.github.com/repos/${contest.full_name}/contents/data`,
      ghHeaders
    )
    if (!Array.isArray(files)) continue

    const highFindings = files.filter(f => f.name.match(/^H-\d+/)).slice(0, 3)

    for (const file of highFindings) {
      const content = await get(file.url, ghHeaders)
      if (!content?.content) continue
      const md = Buffer.from(content.content, 'base64').toString('utf-8')

      // Extract title and key info
      const titleMatch = md.match(/^##\s+(.+)/m) || md.match(/^#\s+(.+)/m)
      const title = titleMatch?.[1]?.trim().replace(/\[H-\d+\]\s*/, '') || file.name

      // Extract vulnerability type from title
      const vulnType = detectVulnType(title + ' ' + md.slice(0, 500))

      if (!vulnPatterns.has(vulnType)) vulnPatterns.set(vulnType, [])
      vulnPatterns.get(vulnType).push({
        title, contest: contest.name, content: md.slice(0, 2000)
      })
    }
    await sleep(800)
  }

  // Build skills per vuln pattern
  const skills = []
  for (const [vulnType, findings] of vulnPatterns.entries()) {
    if (findings.length < 1) continue
    const examples = findings.slice(0, 3)

    const content = `# Smart Contract Security: ${vulnType}

## Pattern Overview
- **Vulnerability Type:** ${vulnType}
- **Severity:** High (Critical)
- **Occurrences found:** ${findings.length} across Code4rena audits
- **Source:** Code4rena public findings

## Real Examples

${examples.map((e, i) => `### Example ${i + 1}: ${e.title}
**Contest:** ${e.contest}

\`\`\`
${e.content.slice(0, 800)}
\`\`\`
`).join('\n')}

## Prevention Checklist
${getPreventionChecklist(vulnType)}

## References
${findings.map(f => `- [${f.title}] in ${f.contest}`).join('\n')}
`
    skills.push({
      id: `security/${slugify(vulnType)}`,
      name: `Security Pattern: ${vulnType}`,
      ecosystem: 'ethereum',
      type: 'security-vuln',
      time_sensitivity: 'evergreen',
      source: 'code4rena',
      confidence: 'high',
      version: '1.0.0',
      content,
      tags: ['security', 'audit', 'vulnerability', slugify(vulnType), 'smart-contract', 'code4rena'],
    })
  }

  // Overall security overview skill
  const overviewContent = `# Smart Contract Security: Audit Landscape

## Data Source
- Code4rena public findings (2024-2025)
- Analyzed ${contests.length} contest audit repos

## Most Common High Severity Patterns
${[...vulnPatterns.entries()].sort((a, b) => b[1].length - a[1].length).map(([type, findings], i) =>
  `${i + 1}. **${type}** — ${findings.length} occurrences`
).join('\n')}

## Key Statistics
- Contests analyzed: ${contests.length}
- Unique vulnerability patterns: ${vulnPatterns.size}
- Most recurring issue: **${[...vulnPatterns.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] || 'N/A'}**

## Audit Readiness Checklist
- [ ] Reentrancy protection on all state-changing external calls
- [ ] Access control on all privileged functions
- [ ] Integer overflow/underflow checks (use SafeMath or Solidity 0.8+)
- [ ] Price manipulation resistance (TWAP over spot price)
- [ ] Flash loan attack vectors considered
- [ ] Emergency pause mechanism
- [ ] Proper event emissions for all state changes
- [ ] Slippage protection in AMM interactions

## Resources
- Code4rena: https://code4rena.com
- Solodit: https://solodit.cyfrin.io
- Immunefi: https://immunefi.com
`
  skills.push({
    id: 'security/audit-landscape-overview',
    name: 'Smart Contract Security: Audit Landscape',
    ecosystem: 'ethereum',
    type: 'security-vuln',
    time_sensitivity: 'evergreen',
    source: 'code4rena',
    confidence: 'high',
    version: '1.0.0',
    content: overviewContent,
    tags: ['security', 'audit', 'smart-contract', 'code4rena', 'overview'],
  })

  let written = 0
  for (const s of skills) {
    if (await upsert(s)) { written++; process.stdout.write('.') }
    await sleep(80)
  }
  console.log(`\n   Written: ${written}/${skills.length}`)
  return written
}

function detectVulnType(text) {
  const t = text.toLowerCase()
  if (t.includes('reentrancy') || t.includes('re-entrancy')) return 'Reentrancy'
  if (t.includes('access control') || t.includes('unauthorized') || t.includes('missing check')) return 'Access Control'
  if (t.includes('price manipulation') || t.includes('oracle') || t.includes('twap')) return 'Oracle/Price Manipulation'
  if (t.includes('flash loan') || t.includes('flashloan')) return 'Flash Loan Attack'
  if (t.includes('integer overflow') || t.includes('underflow') || t.includes('arithmetic')) return 'Arithmetic Issues'
  if (t.includes('front.?run') || t.includes('sandwich') || t.includes('mev')) return 'Front-running/MEV'
  if (t.includes('denial of service') || t.includes('dos') || t.includes('gas grief')) return 'Denial of Service'
  if (t.includes('logic error') || t.includes('incorrect calculation') || t.includes('wrong formula')) return 'Logic Errors'
  if (t.includes('signature') || t.includes('eip-712') || t.includes('ecrecover')) return 'Signature Issues'
  if (t.includes('storage collision') || t.includes('slot') || t.includes('proxy')) return 'Storage/Proxy Issues'
  if (t.includes('token') && (t.includes('loss') || t.includes('stuck') || t.includes('drain'))) return 'Token Drain/Loss'
  return 'General Vulnerability'
}

function getPreventionChecklist(vulnType) {
  const checklists = {
    'Reentrancy': `- [ ] Apply checks-effects-interactions pattern
- [ ] Use OpenZeppelin ReentrancyGuard
- [ ] Update state before external calls
- [ ] Avoid calling unknown contracts`,
    'Access Control': `- [ ] Use OpenZeppelin Ownable or AccessControl
- [ ] Add onlyOwner/onlyRole modifiers
- [ ] Validate msg.sender on all privileged functions
- [ ] Multi-sig for critical operations`,
    'Oracle/Price Manipulation': `- [ ] Use TWAP instead of spot price
- [ ] Use Chainlink price feeds
- [ ] Add slippage tolerance checks
- [ ] Avoid on-chain price queries in same transaction`,
    'Flash Loan Attack': `- [ ] Use TWAP for price references
- [ ] Snapshot balances before complex operations
- [ ] Avoid same-block price manipulation vectors`,
    'Arithmetic Issues': `- [ ] Use Solidity 0.8+ (built-in overflow checks)
- [ ] Use SafeMath for older versions
- [ ] Test edge cases (0, max uint, etc.)
- [ ] Watch for precision loss in divisions`,
  }
  return checklists[vulnType] || `- [ ] Review similar past audit findings on Code4rena
- [ ] Test with Foundry fuzzing
- [ ] Get peer review before deployment`
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== AgentRel Skills Import: Multi-Source ===')

  const r1 = await importDefiLlama()
  const r2 = await importRaises()
  const r3 = await importNpmTrends()
  const r4 = await importCode4rena()

  const total = r1 + r2 + r3 + r4
  console.log(`\n=== DONE ===`)
  console.log(`DeFiLlama TVL:  ${r1} skills`)
  console.log(`Raises:         ${r2} skills`)
  console.log(`npm Trends:     ${r3} skills`)
  console.log(`Code4rena:      ${r4} skills`)
  console.log(`Total written:  ${total} skills`)

  // Final DB count
  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills?select=type`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  const all = await res.json()
  const byType = {}
  for (const r of all) byType[r.type] = (byType[r.type] || 0) + 1
  console.log('\nDB by type:', byType)
}

main().catch(console.error)
