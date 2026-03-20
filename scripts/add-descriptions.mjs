#!/usr/bin/env node
/**
 * 批量给 skills 表的 description 字段补充触发描述
 * description = SKILL.md 标准必填字段，是 AI 的触发器
 */
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))

// description 生成规则（按 type + id pattern）
function generateDescription(skill) {
  const { id, name, type, ecosystem, tags = [] } = skill
  const eco = ecosystem || 'web3'
  const ecoLabel = eco === 'multi-chain' ? 'Web3' : (eco.charAt(0).toUpperCase() + eco.slice(1))

  // 精确匹配（insights/overview）
  if (id.startsWith('hackathon/insights-')) {
    const eco2 = id.replace('hackathon/insights-', '')
    return `Use when user asks about ${ecoLabel} hackathon experience, tips, winning strategies, or past projects. Covers platform guides, tech stack patterns, and judging criteria for ${ecoLabel} ecosystem hackathons.`
  }
  if (id === 'hackathon/overview-all') {
    return `Use when user asks about Web3 hackathon platforms, how to participate, prize structures, or general hackathon strategy. Covers ETHGlobal, Colosseum, Devpost, DoraHacks, and other major platforms.`
  }
  if (id.startsWith('grants/insights-')) {
    const eco2 = id.replace('grants/insights-', '')
    return `Use when user asks about ${ecoLabel} grants, funding opportunities, application tips, or successful grant projects. Contains real project examples and application patterns from the ${ecoLabel} ecosystem.`
  }
  if (id.startsWith('grants/overview-')) {
    if (id.includes('all')) return `Use when user asks about Web3 grant programs, funding sources, or which grant platform to apply to. Compares W3F, NEAR, Gitcoin, ESP, Optimism RPGF, Solana Foundation, and other major programs.`
    const eco2 = id.replace('grants/overview-', '')
    return `Use when user asks about how to apply for ${ecoLabel} grants, grant requirements, or the application process for the ${ecoLabel} ecosystem grant program.`
  }

  // Type-based rules
  switch (type) {
    case 'hackathon-case':
      return `Use when user asks about ${ecoLabel} hackathon projects, examples, or needs inspiration for building on ${ecoLabel}. This is a real project from the ${ecoLabel} developer ecosystem.`

    case 'grant':
      if (id.includes('overview') || id.includes('insights')) {
        return `Use when user asks about grants in the ${ecoLabel} ecosystem or needs guidance on applying for blockchain grants.`
      }
      return `Use when user researches ${ecoLabel} grant programs or needs examples of successfully funded projects in the ${ecoLabel} ecosystem.`

    case 'security-vuln': {
      const vulnTypeMap = {
        'reentrancy': 'reentrancy attacks',
        'access-control': 'access control vulnerabilities',
        'oracle-manipulation': 'oracle manipulation or price manipulation',
        'flash-loan': 'flash loan attacks',
        'integer-overflow': 'integer overflow or underflow bugs',
        'frontrunning': 'front-running or sandwich attacks',
        'dos': 'denial-of-service vulnerabilities',
        'signature-replay': 'signature replay attacks',
        'delegatecall': 'delegatecall vulnerabilities',
        'bridge-vuln': 'bridge or cross-chain vulnerabilities',
        'logic-error': 'smart contract logic errors',
      }
      const vulnTag = (tags || []).find(t => vulnTypeMap[t])
      const vulnDesc = vulnTag ? vulnTypeMap[vulnTag] : 'smart contract security vulnerabilities'
      const contest = id.split('/')[1]?.split('-').slice(0, 3).join('-') || 'audit'
      return `Use when user asks about ${vulnDesc}, smart contract auditing, or security patterns. Real finding from Code4rena audit contest (${contest}).`
    }

    case 'defi-protocol':
      return `Use when user asks about the ${name} DeFi protocol, its TVL, current status, or performance in the ${ecoLabel} ecosystem.`

    case 'fundraising':
      return `Use when user researches Web3 fundraising, investment rounds, or VC activity. Contains data about ${name} funding.`

    case 'technical-doc':
      if (id.startsWith('standards/eip-')) {
        const num = id.replace('standards/eip-', '')
        return `Use when user asks about EIP-${num} or ${name}. Official Ethereum Improvement Proposal covering the standard specification, interface, and implementation guidance.`
      }
      return `Use when user needs technical documentation about ${name} in the ${ecoLabel} ecosystem.`

    case 'dev-tooling':
      return `Use when user asks about ${name}, compares Web3 developer tools, or needs download statistics and adoption data for ${ecoLabel} development tools.`

    case 'docs':
    case 'guide':
      return `Use when user asks about ${name} or needs documentation and guides for ${ecoLabel} development.`

    default:
      return `Use when user asks about ${name} in the Web3 or ${ecoLabel} ecosystem.`
  }
}

async function main() {
  // 拉所有 skills
  let all = []
  let offset = 0
  const limit = 500
  while (true) {
    const r = await fetch(`${BASE}/rest/v1/skills?select=id,name,type,ecosystem,tags,description&limit=${limit}&offset=${offset}`, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    })
    const batch = await r.json()
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < limit) break
    offset += limit
  }
  console.log('Total skills:', all.length)

  // 过滤需要补充 description 的
  const needUpdate = all.filter(s => !s.description || s.description.trim() === '')
  console.log('Need description:', needUpdate.length)

  let updated = 0, skipped = 0, errors = 0

  for (const skill of needUpdate) {
    const description = generateDescription(skill)
    if (!description) { skipped++; continue }

    const r = await fetch(`${BASE}/rest/v1/skills?id=eq.${encodeURIComponent(skill.id)}`, {
      method: 'PATCH',
      headers: {
        apikey: KEY, Authorization: 'Bearer ' + KEY,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify({ description, updated_at: new Date().toISOString() }),
    })
    if (r.ok) { updated++; process.stdout.write('.') }
    else { errors++; process.stdout.write('x') }
    await sleep(30)
  }

  console.log(`\nUpdated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`)

  // 抽样验证
  const sample = await fetch(`${BASE}/rest/v1/skills?select=id,name,description&limit=5&order=updated_at.desc`, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  const sampleData = await sample.json()
  console.log('\n=== Sample ===')
  for (const s of sampleData) {
    console.log(`[${s.id}]\n  desc: ${s.description?.slice(0, 100)}\n`)
  }
}

main().catch(console.error)
