#!/usr/bin/env node
/**
 * Code4rena security findings → AgentRel skills
 * 数据源：github.com/code-423n4/{contest}-findings (issues)
 * 每个 High/Medium severity finding 生成一条 security-vuln skill
 */
const GH = 'process.env.GITHUB_TOKEN'
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)

async function ghGet(url) {
  const r = await fetch(url, {
    headers: { Authorization: 'token ' + GH, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'AgentRel/1.0' }
  })
  const remain = r.headers.get('x-ratelimit-remaining')
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${url}`)
  return { data: await r.json(), remain }
}

async function upsert(skill) {
  const r = await fetch(BASE + '/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  return r.ok
}

// 检测漏洞类型
function detectVulnType(title, body) {
  const text = (title + ' ' + (body || '')).toLowerCase()
  if (text.includes('reentrancy')) return 'reentrancy'
  if (text.includes('access control') || text.includes('unauthorized')) return 'access-control'
  if (text.includes('price manipulation') || text.includes('oracle')) return 'oracle-manipulation'
  if (text.includes('flash loan')) return 'flash-loan'
  if (text.includes('overflow') || text.includes('underflow')) return 'integer-overflow'
  if (text.includes('front.run') || text.includes('frontrun') || text.includes('sandwich')) return 'frontrunning'
  if (text.includes('dos') || text.includes('denial of service') || text.includes('gas limit')) return 'dos'
  if (text.includes('signature') || text.includes('replay')) return 'signature-replay'
  if (text.includes('precision') || text.includes('rounding')) return 'precision-loss'
  if (text.includes('storage') || text.includes('slot')) return 'storage-collision'
  if (text.includes('delegate') || text.includes('delegatecall')) return 'delegatecall'
  if (text.includes('cross.chain') || text.includes('bridge')) return 'bridge-vuln'
  if (text.includes('logic')) return 'logic-error'
  return 'smart-contract-vuln'
}

// 检测生态
function detectEco(contestName) {
  const n = contestName.toLowerCase()
  if (n.includes('solana') || n.includes('anchor')) return 'solana'
  if (n.includes('polygon') || n.includes('matic')) return 'polygon'
  if (n.includes('arbitrum')) return 'arbitrum'
  if (n.includes('optimism') || n.includes('base')) return 'optimism'
  if (n.includes('bsc') || n.includes('binance')) return 'bnb'
  if (n.includes('cosmos') || n.includes('osmosis')) return 'cosmos'
  return 'ethereum'
}

async function getContestList() {
  // 搜 code-423n4 org 下所有 -findings repo
  const contests = []
  let page = 1
  while (true) {
    const { data, remain } = await ghGet(
      `https://api.github.com/search/repositories?q=org:code-423n4+findings+in:name&sort=updated&per_page=100&page=${page}`
    )
    for (const repo of data.items || []) {
      if (repo.name.endsWith('-findings')) {
        contests.push(repo.name.replace('-findings', ''))
      }
    }
    console.log(`Page ${page}: ${data.items?.length} repos, rate: ${remain}`)
    if (!data.items || data.items.length < 100) break
    page++
    await sleep(500)
  }
  return contests
}

async function getFindings(contest, perContest = 5) {
  const findings = []
  // 拉 High + Medium severity issues
  for (const label of ['3 (High Risk)', '2 (Med Risk)']) {
    const encoded = encodeURIComponent(label)
    try {
      const { data } = await ghGet(
        `https://api.github.com/repos/code-423n4/${contest}-findings/issues?labels=${encoded}&state=closed&per_page=${perContest}&sort=created`
      )
      for (const issue of (data || [])) {
        if (issue.pull_request) continue
        findings.push({
          title: issue.title,
          body: (issue.body || '').slice(0, 3000),
          severity: label.includes('High') ? 'high' : 'medium',
          url: issue.html_url,
          number: issue.number,
        })
      }
    } catch (e) {
      // repo may not have this label
    }
    await sleep(200)
  }
  return findings
}

async function main() {
  // 先拿现有数量
  const ex = await fetch(BASE + '/rest/v1/skills?type=eq.security-vuln&select=id', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  const existing = new Set((await ex.json()).map(r => r.id))
  console.log('Existing security-vuln:', existing.size)

  // 精选近期高质量比赛（2023-2024）
  const TARGET_CONTESTS = [
    '2024-01-salty', '2024-02-uniswap-foundation', '2024-03-revert-lend',
    '2024-04-panoptic', '2024-05-predy', '2024-06-vultisig',
    '2024-07-reserve-protocol', '2024-08-pooltogether',
    '2023-10-zkevm', '2023-11-zetachain', '2023-12-ethereumcreditguild',
    '2023-08-dopex', '2023-07-tapioca', '2023-06-stader',
    '2023-05-maia', '2023-04-frankencoin', '2023-03-wenwin',
    '2024-09-morpho-blue', '2024-10-kleidi',
    // DeFi protocols
    '2023-01-ajna', '2023-02-olympus', '2023-09-centrifuge',
    '2022-12-tigris', '2022-11-stakehouse', '2022-10-inverse',
  ]

  let written = 0
  let skipped = 0

  for (const contest of TARGET_CONTESTS) {
    process.stdout.write(`[${contest}] `)
    let findings
    try {
      findings = await getFindings(contest, 8)
    } catch (e) {
      console.log('ERROR:', e.message)
      await sleep(1000)
      continue
    }

    if (findings.length === 0) {
      console.log('0 findings')
      continue
    }

    console.log(findings.length + ' findings')
    const eco = detectEco(contest)

    for (const f of findings) {
      const vulnType = detectVulnType(f.title, f.body)
      const id = `security/${contest}-${f.number}`
      if (existing.has(id)) { skipped++; continue }

      // 提取影响描述（body 前200字）
      const impactMatch = f.body.match(/##\s*Impact\s*\n+([\s\S]{20,300}?)(?=\n##|$)/i)
      const impact = impactMatch?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 200) || ''

      const content = `# ${f.title}

## 基本信息
- **Contest:** ${contest}
- **Severity:** ${f.severity === 'high' ? '🔴 High' : '🟡 Medium'}
- **Type:** ${vulnType}
- **Source:** [Code4rena #${f.number}](${f.url})

## 漏洞描述
${f.body.slice(0, 2000)}
${f.body.length > 2000 ? '\n> *(内容已截断，完整内容见原链接)*' : ''}

## 关键信息
- **漏洞类型：** ${vulnType}
- **生态：** ${eco}
${impact ? `- **影响：** ${impact}` : ''}
`

      const ok = await upsert({
        id,
        name: `[${f.severity === 'high' ? 'H' : 'M'}] ${f.title.slice(0, 120)}`,
        ecosystem: eco,
        type: 'security-vuln',
        time_sensitivity: 'evergreen',
        source: 'community',
        confidence: 'high',
        version: '1.0.0',
        content,
        tags: ['security', 'code4rena', vulnType, eco, f.severity, 'audit'],
      })
      if (ok) { written++; process.stdout.write('.') }
      await sleep(80)
    }
    console.log('')
    await sleep(400)
  }

  console.log(`\nWritten: ${written}, Skipped (dup): ${skipped}`)

  // Final count
  const fin = await fetch(BASE + '/rest/v1/skills?type=eq.security-vuln&select=id', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  console.log('DB security-vuln total:', (await fin.json()).length)
}

main().catch(console.error)
