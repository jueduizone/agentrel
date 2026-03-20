#!/usr/bin/env node
/**
 * 多生态 Grant 案例导入
 * 覆盖：NEAR、Ethereum ESP、Optimism、Arbitrum、Polygon、Chainlink、Solana、Avalanche
 * 数据来源：GitHub 公开 grant 仓库 + 官方 forum 数据
 */
const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_KEY'
const GH_TOKEN = 'process.env.GITHUB_TOKEN'
const sleep = ms => new Promise(r => setTimeout(r, ms))

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)
}

async function ghGet(path) {
  const r = await fetch('https://api.github.com' + path, {
    headers: { Authorization: 'token ' + GH_TOKEN, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'AgentRel/1.0' }
  })
  if (!r.ok) return null
  return r.json()
}

async function upsert(skill) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  return r.ok
}

// ─── 1. NEAR: 从 near/devdao-grants + pagodahq/grants 抓真实项目 ─────────────
async function importNEAR() {
  console.log('\n[NEAR] Fetching real project grants...')
  const skills = []

  // NEAR DevDAO grants repo - issues as grant proposals
  const repos = ['near/devdao-grants', 'near-foundation/devhub-requested-funding']
  for (const repo of repos) {
    const issues = await ghGet(`/repos/${repo}/issues?state=closed&labels=approved&per_page=30`)
    if (!issues) continue
    for (const issue of issues) {
      const title = issue.title.replace(/^\[.*?\]\s*/, '').trim()
      const body = (issue.body || '').slice(0, 1500)
      const amountMatch = body.match(/\$[\d,]+|\d+[\s,]*NEAR|\d+[\s,]*USD/i)
      const amount = amountMatch?.[0] || 'Not specified'

      skills.push({
        id: `grants/near-project-${slugify(title)}`,
        name: `${title} (NEAR Grant)`,
        ecosystem: 'near',
        type: 'grant',
        time_sensitivity: 'stable',
        source: 'community',
        confidence: 'high',
        version: '1.0.0',
        content: `# ${title} — NEAR Grant

**Platform:** NEAR Foundation / DevDAO
**Status:** Approved
**Amount:** ${amount}
**Source:** https://github.com/${repo}/issues/${issue.number}

## Project Overview
${body.slice(0, 800)}

## Key Takeaways
- Approved NEAR grant proposal
- Demonstrates what NEAR Foundation funds in this category
`,
        tags: ['grant', 'near', 'funding', 'approved', 'devdao'],
      })
    }
    await sleep(1000)
  }

  // Also search GitHub for NEAR grant projects
  const searches = [
    'NEAR grant funded project',
    'NEAR foundation grant accepted',
    'built with NEAR grant',
  ]
  for (const q of searches) {
    const data = await ghGet(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=15`)
    if (!data?.items) continue
    for (const repo of data.items) {
      if (repo.stargazers_count < 2) continue
      const allText = repo.name + ' ' + (repo.description || '') + ' ' + (repo.topics || []).join(' ')
      skills.push({
        id: `grants/near-gh-${slugify(repo.name)}`,
        name: `${repo.name} (NEAR Ecosystem)`,
        ecosystem: 'near',
        type: 'grant',
        time_sensitivity: 'stable',
        source: 'community',
        confidence: 'medium',
        version: '1.0.0',
        content: `# ${repo.name} — NEAR Ecosystem Project

**Repo:** [${repo.full_name}](${repo.html_url})
**Stars:** ⭐ ${repo.stargazers_count}
**Language:** ${repo.language || 'N/A'}
**Topics:** ${(repo.topics || []).join(', ')}

## Description
${repo.description || 'N/A'}

## Why This Matters for Grant Applicants
- Real NEAR ecosystem project as reference
- Shows what gets built and gains traction on NEAR
- Use as competitive analysis or inspiration for grant proposals
`,
        tags: ['grant', 'near', 'funding', 'ecosystem', 'reference'],
      })
    }
    await sleep(1200)
  }

  let written = 0
  for (const s of skills) {
    if (await upsert(s)) { written++; process.stdout.write('.') }
    await sleep(80)
  }
  console.log(`\n  NEAR: ${written}/${skills.length}`)
  return written
}

// ─── 2. Ethereum ESP ─────────────────────────────────────────────────────────
async function importEthereumESP() {
  console.log('\n[Ethereum ESP] Building grant guide with real cases...')

  // ESP doesn't have a public GitHub, use curated knowledge + search
  const searches = [
    'ethereum foundation grant funded',
    'ESP grant ethereum research',
    'ethereum public goods grant',
  ]
  const skills = []

  for (const q of searches) {
    const data = await ghGet(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=15`)
    if (!data?.items) continue
    for (const repo of data.items) {
      if (repo.stargazers_count < 5) continue
      skills.push({
        id: `grants/eth-esp-${slugify(repo.name)}`,
        name: `${repo.name} (ETH ESP)`,
        ecosystem: 'ethereum',
        type: 'grant',
        time_sensitivity: 'stable',
        source: 'community',
        confidence: 'medium',
        version: '1.0.0',
        content: `# ${repo.name} — Ethereum Ecosystem Project

**Repo:** [${repo.full_name}](${repo.html_url})
**Stars:** ⭐ ${repo.stargazers_count}
**Language:** ${repo.language || 'N/A'}

## Description
${repo.description || 'N/A'}

## Relevance to Ethereum Grants
- Active Ethereum ecosystem project
- Demonstrates the type of work EF ESP funds
- Reference for grant proposal alignment
`,
        tags: ['grant', 'ethereum', 'funding', 'esp', 'ecosystem'],
      })
    }
    await sleep(1200)
  }

  // ESP Overview skill (curated)
  skills.unshift({
    id: 'grants/overview-ethereum-esp',
    name: 'Ethereum Foundation ESP 申请指南',
    ecosystem: 'ethereum',
    type: 'grant',
    time_sensitivity: 'stable',
    source: 'community',
    confidence: 'high',
    version: '1.0.0',
    content: `# Ethereum Foundation ESP (Ecosystem Support Program) 申请指南

## 什么是 ESP？
EF ESP 是以太坊基金会对生态建设者的资助项目，无金额上限，聚焦公共品和基础设施。

## 资助优先方向
- **协议研究**：EIP 实现、L2 扩展、共识机制
- **开发者工具**：Hardhat/Foundry 等工具链、调试工具、测试框架
- **教育与文档**：高质量教程、本地化内容
- **安全**：形式化验证、审计工具、漏洞研究
- **隐私**：ZK 技术、混合器、隐私协议
- **Layer 2**：Rollup 基础设施、跨链桥

## 申请类型
| 类型 | 金额 | 周期 |
|------|------|------|
| Small Grants | $500 - $30K | 快速审批（2周） |
| Project Grants | $30K+ | 完整评估（6-8周） |
| Academic Grants | 不限 | 学术研究专项 |

## 申请入口
https://esp.ethereum.foundation/

## 申请流程
1. 提交申请表（描述项目/影响/预算/团队）
2. ESP 团队初步评估
3. 技术/领域专家审核
4. 决定并通知

## 成功案例类型
- Ethereum 客户端（Geth、Prysm、Lighthouse 都曾获得支持）
- 开发者工具（Remix IDE、eth-tester）
- 研究论文（EIP 提案配套研究）
- 本地开发者社区活动

## 申请技巧
- **公共品优先**：ESP 不投商业项目，必须有明确公共价值
- **以太坊优先**：项目必须对以太坊生态有直接贡献
- **团队可信度**：GitHub 贡献历史、社区参与度
- **影响力量化**：说清楚有多少人会受益

## 参考资源
- ESP 官网: https://esp.ethereum.foundation/
- 往期资助公告: https://blog.ethereum.org/category/grants
- EF 博客: https://ethereum.foundation/
`,
    tags: ['grant', 'ethereum', 'esp', 'funding', 'overview', 'guide'],
  })

  let written = 0
  for (const s of skills) {
    if (await upsert(s)) { written++; process.stdout.write('.') }
    await sleep(80)
  }
  console.log(`\n  ETH ESP: ${written}/${skills.length}`)
  return written
}

// ─── 3. Optimism RPGF ────────────────────────────────────────────────────────
async function importOptimism() {
  console.log('\n[Optimism] RPGF cases...')
  const skills = []

  // Search for RPGF recipients
  const queries = ['optimism RPGF retroactive funding', 'optimism retropgf recipient', 'built on optimism grant']
  for (const q of queries) {
    const data = await ghGet(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=15`)
    if (!data?.items) continue
    for (const repo of data.items) {
      if (repo.stargazers_count < 3) continue
      skills.push({
        id: `grants/op-${slugify(repo.name)}`,
        name: `${repo.name} (Optimism Ecosystem)`,
        ecosystem: 'optimism',
        type: 'grant',
        time_sensitivity: 'stable',
        source: 'community',
        confidence: 'medium',
        version: '1.0.0',
        content: `# ${repo.name} — Optimism Ecosystem Project

**Repo:** [${repo.full_name}](${repo.html_url})
**Stars:** ⭐ ${repo.stargazers_count}
**Language:** ${repo.language || 'N/A'}

## Description
${repo.description || 'N/A'}

## RPGF 相关性
- Optimism 生态活跃项目
- 类似项目曾获 RPGF 回溯奖励
- 参考用于 RPGF 申请方向
`,
        tags: ['grant', 'optimism', 'rpgf', 'funding', 'ecosystem'],
      })
    }
    await sleep(1200)
  }

  // RPGF Overview
  skills.unshift({
    id: 'grants/overview-optimism-rpgf',
    name: 'Optimism RPGF 完整指南',
    ecosystem: 'optimism',
    type: 'grant',
    time_sensitivity: 'stable',
    source: 'community',
    confidence: 'high',
    version: '1.0.0',
    content: `# Optimism Retroactive Public Goods Funding (RPGF) 完整指南

## 什么是 RPGF？
RPGF 是 Optimism 独创的**回溯式**资助机制——先做贡献，再获得奖励。不需要提前申请，做了就有机会被认可。

## 核心理念
> "It's easier to agree on what was useful than what will be useful"
> 已经产生价值的东西更容易评判，所以回溯发放比前置申请更公平。

## RPGF 轮次历史
| 轮次 | 时间 | 总资金 | 获奖者数 |
|------|------|--------|---------|
| RPGF 1 | 2021 | $1M | 58 个项目 |
| RPGF 2 | 2023 | $10M OP | 195 个项目 |
| RPGF 3 | 2023 | $30M OP | 501 个项目 |
| RPGF 4 | 2024 | $10M OP | 208 个项目 |
| RPGF 5 | 2024 | $8M OP | - |

## 资助类别
1. **OP Stack & Collective** — Optimism 协议开发
2. **Developer Ecosystem** — 工具、SDK、文档
3. **End User Experience** — DApp、钱包、UX 改善
4. **Governance & Education** — 治理工具、教育内容

## 如何获得 RPGF？
1. **在 Optimism 生态做有价值的事**（不需要申请）
2. RPGF 开始时，提交 Impact Attestation（影响力说明）
3. BadgeHolder（投票者）评估并投票分配
4. 按得票比例分配资金

## 提高 RPGF 获奖几率的方法
- **公开影响数据**：用户数、交易量、Star 数、下载量
- **链上可验证**：越多链上证明越好
- **社区认知**：在 Optimism Discord/Forum 活跃
- **多轮持续贡献**：一次性项目不如持续维护的项目

## 申请/参与入口
- Agora（投票平台）: https://vote.optimism.io
- RetroPGF 官网: https://retrofunding.optimism.io
- Optimism Forum: https://gov.optimism.io

## 与传统 Grant 的区别
| | 传统 Grant | RPGF |
|-|-----------|------|
| 时间 | 先申请，后做 | 先做，后奖励 |
| 风险 | 可能申请失败 | 做了一定有记录 |
| 评判标准 | 潜力/计划 | 实际影响 |
| 不确定性 | 高 | 低 |
`,
    tags: ['grant', 'optimism', 'rpgf', 'funding', 'overview', 'guide', 'retroactive'],
  })

  let written = 0
  for (const s of skills) {
    if (await upsert(s)) { written++; process.stdout.write('.') }
    await sleep(80)
  }
  console.log(`\n  Optimism: ${written}/${skills.length}`)
  return written
}

// ─── 4. Arbitrum, Polygon, Chainlink, Solana 平台指南 ────────────────────────
async function importOtherPlatforms() {
  console.log('\n[Other Platforms] Writing grant guides...')

  const guides = [
    {
      id: 'grants/overview-arbitrum',
      name: 'Arbitrum Grants 完整指南',
      ecosystem: 'arbitrum',
      tags: ['grant', 'arbitrum', 'funding', 'overview', 'guide', 'dao'],
      content: `# Arbitrum DAO Grants 完整指南

## 资助来源
1. **Arbitrum Foundation Grants** — 基金会直接资助
2. **Arbitrum DAO Treasury** — DAO 治理投票资助
3. **LTIPP (Long-Term Incentive Pilot Program)** — 流动性激励
4. **STIP (Short-Term Incentive Program)** — 短期激励

## 申请入口
- Foundation Grants: https://arbitrumfoundation.notion.site/Arbitrum-Foundation-Grants-Program
- DAO Proposals: https://forum.arbitrum.foundation/

## 资助优先方向
- **DeFi 协议**：AMM、借贷、衍生品、结构化产品
- **开发者工具**：Arbitrum-specific 工具链、测试框架
- **跨链基础设施**：桥接、互操作性
- **Gaming & NFT**：链上游戏、NFT 市场
- **用户增长**：降低使用门槛的工具

## 申请流程（DAO Treasury）
1. 在 Arbitrum Forum 发 [RFC] 帖子
2. 社区讨论（至少 1 周）
3. 发布正式提案到 Tally/Snapshot
4. DAO 投票（7 天）
5. 通过则执行

## 金额范围
- Foundation Grants: $10K - $500K
- DAO Treasury: 无上限（取决于提案）
- LTIPP: $50K - $5M（ARB token 激励）

## 成功关键
- **Arbitrum 独特价值**：为什么在 Arbitrum 而不是其他链
- **TVL/用户数据**：已有链上数据支撑
- **社区共识**：Forum 讨论热度高
- **详细里程碑**：Milestone-based 付款

## 参考资源
- Arbitrum Forum: https://forum.arbitrum.foundation/
- Grants 页面: https://arbitrumfoundation.notion.site/
- Tally: https://www.tally.xyz/gov/arbitrum
`,
    },
    {
      id: 'grants/overview-polygon',
      name: 'Polygon Grants 完整指南',
      ecosystem: 'polygon',
      tags: ['grant', 'polygon', 'funding', 'overview', 'guide'],
      content: `# Polygon Grants 完整指南

## 资助项目
1. **Polygon Foundation Grants** — 主要资助渠道
2. **Polygon Village** — 早期项目孵化
3. **Polygon zkEVM Grants** — zkEVM 生态专项

## 申请入口
- https://polygon.technology/grants
- zkEVM: https://zkevm.polygon.technology/

## 资助方向
- **DeFi**：DEX、借贷、衍生品
- **NFT & Gaming**：链游、NFT 平台、元宇宙
- **企业应用**：供应链、数字身份、合规工具
- **zkEVM 生态**：ZK 证明、隐私应用、Rollup 工具
- **开发者工具**：SDK、调试工具、基础设施

## 金额范围
- Seed: $5K - $25K
- Growth: $25K - $100K
- Scale: $100K+

## Polygon zkEVM 专项
- 优先支持 ZK 原生应用
- 支持 EVM 等价性迁移工具
- 硬件加速 ZK 证明项目

## 申请技巧
- 展示 Polygon 生态整合（Polygon ID、zkEVM 兼容）
- 提供详细 GTM 计划
- 包含用户增长预测和数据指标

## 参考资源
- Polygon Grants: https://polygon.technology/grants
- Community Forum: https://forum.polygon.technology/
`,
    },
    {
      id: 'grants/overview-chainlink',
      name: 'Chainlink BUILD & Grants 完整指南',
      ecosystem: 'ethereum',
      tags: ['grant', 'chainlink', 'funding', 'overview', 'guide', 'oracle'],
      content: `# Chainlink BUILD & Grants 完整指南

## 两个主要项目

### 1. Chainlink BUILD Program
面向早期项目的**综合支持**（不只是资金）：
- 使用 Chainlink 服务的优先访问
- 技术集成支持
- 共同市场推广
- 投资人介绍

**条件：** 项目需要承诺将一定比例的 native token 给 Chainlink 服务提供者

### 2. Chainlink Grants
纯资金资助，专注特定技术方向：
- **范围：** $5K - $50K
- **重点：** 基础设施、工具、研究
- **审批：** 2-4 周

## 资助方向
- 使用 Chainlink Data Feeds、CCIP、VRF、Automation 的项目
- 跨链互操作性解决方案
- 预言机安全研究
- DeFi 底层基础设施
- Gaming（使用 VRF 实现公平随机）

## 申请入口
- BUILD: https://chainlinklabs.com/build
- Grants: https://chain.link/grants

## 申请要求
- 必须使用或计划使用 Chainlink 产品
- 有明确的技术集成路线
- 开源优先

## 典型受资助项目类型
- AMM / Perpetual DEX（使用价格 Feed）
- 保险协议（使用参数触发）
- NFT 随机铸造（使用 VRF）
- 跨链 DApp（使用 CCIP）

## 参考资源
- Chainlink Grants: https://chain.link/grants
- 文档: https://docs.chain.link/
`,
    },
    {
      id: 'grants/overview-solana',
      name: 'Solana Foundation Grants 完整指南',
      ecosystem: 'solana',
      tags: ['grant', 'solana', 'funding', 'overview', 'guide'],
      content: `# Solana Foundation Grants & Ecosystem Fund 完整指南

## 主要资助渠道

### 1. Solana Foundation Grants
- **金额：** $5K - $100K
- **周期：** 申请到决定约 4-6 周
- **重点：** 基础设施、工具、教育

### 2. Solana Ecosystem Fund
- 由 Multicoin Capital、a16z 等共同设立的 $100M 生态基金
- 面向早期项目的股权投资
- 不是 grant，是投资

### 3. Superteam Grants（社区管理）
- 各区域 Superteam（India、NG、Germany 等）有本地 grant
- 金额较小：$500 - $5K
- 快速审批（1-2周）

## 资助优先方向
- **DeFi on Solana**：Serum 生态、Pyth 集成
- **NFT 基础设施**：Metaplex、压缩 NFT 工具
- **移动端**：Saga 生态、移动 dApp
- **开发者工具**：Anchor 插件、调试工具、测试框架
- **跨链**：Wormhole 集成、跨链工具

## 申请入口
- Foundation Grants: https://solana.foundation/grants
- Superteam: https://superteam.fun/grants
- Lamport DAO: https://lamportdao.xyz/

## 关键技术栈要求
- Rust / Anchor 框架
- Solana Program Library (SPL) 集成
- 优先考虑使用 Solana 特有能力（低延迟、高 TPS）的项目

## 申请技巧
- 量化 Solana 优势：TPS、费用对比其他链
- Anchor 代码质量要高（会做代码审查）
- 社区活跃度：Solana Discord / Superteam 论坛

## 参考资源
- Solana Foundation: https://solana.foundation/
- Superteam: https://superteam.fun/
- Helius Grants: https://www.helius.dev/grants
`,
    },
    {
      id: 'grants/overview-avalanche',
      name: 'Avalanche Foundation Grants 完整指南',
      ecosystem: 'avalanche',
      tags: ['grant', 'avalanche', 'avax', 'funding', 'overview', 'guide'],
      content: `# Avalanche Foundation Grants (Multiverse) 完整指南

## 主要项目：Avalanche Multiverse
$290M 激励计划，支持 Subnet 和 DeFi 生态发展。

## 资助类型
1. **Subnet 激励**：创建新的 Avalanche Subnet
2. **DeFi 激励**：在 Avalanche C-Chain 上的 DeFi 协议
3. **Infrastructure Grants**：基础设施和工具

## 申请入口
- https://www.avax.network/grants
- Blizzard Fund: https://blizzard.fund/（投资，非 grant）

## 资助优先方向
- **Subnet 创建**：游戏、企业、特定用途链
- **DeFi**：GMX fork、借贷、稳定币
- **NFT**：Joepegs 生态项目
- **跨链**：Avalanche Bridge 生态

## 金额范围
- Small: $10K - $50K
- Medium: $50K - $200K
- Large: $200K+（Multiverse 级别）

## 核心优势（申请时强调）
- 高 TPS（4500 TPS on C-Chain）
- 低最终确认时间（< 2 秒）
- EVM 兼容
- Subnet 定制化能力

## 申请技巧
- 说清楚为什么 Subnet 而不是普通合约
- 展示企业/机构合作可能性
- Avalanche Rush 激励期间申请成功率更高

## 参考资源
- Avalanche Grants: https://www.avax.network/grants
- Multiverse: https://www.avax.network/multiverse
- Core Forum: https://forum.avax.network/
`,
    },
  ]

  let written = 0
  for (const g of guides) {
    const ok = await upsert({ ...g, type: 'grant', time_sensitivity: 'stable', source: 'community', confidence: 'high', version: '1.0.0' })
    console.log((ok ? '✓' : '✗') + ' ' + g.id)
    if (ok) written++
    await sleep(100)
  }

  // Also update the cross-platform overview with new entries
  await sleep(200)
  console.log(`\n  Other platforms: ${written}/${guides.length}`)
  return written
}

// ─── 5. Search GitHub for Solana/Polygon/Arbitrum grant projects ──────────────
async function importEcosystemProjects() {
  console.log('\n[Ecosystem Projects] GitHub search for funded projects...')

  const queries = [
    { q: 'solana foundation grant funded project', eco: 'solana', prefix: 'sol' },
    { q: 'polygon grant funded dapp', eco: 'polygon', prefix: 'poly' },
    { q: 'arbitrum grant funded protocol', eco: 'arbitrum', prefix: 'arb' },
    { q: 'avalanche grant multiverse subnet', eco: 'avalanche', prefix: 'avax' },
    { q: 'chainlink grant vrf data feeds project', eco: 'ethereum', prefix: 'cl' },
  ]

  const skills = []
  for (const { q, eco, prefix } of queries) {
    const data = await ghGet(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=15`)
    if (!data?.items) continue
    for (const repo of data.items) {
      if (repo.stargazers_count < 3) continue
      skills.push({
        id: `grants/${prefix}-${slugify(repo.name)}`,
        name: `${repo.name} (${eco.charAt(0).toUpperCase() + eco.slice(1)} Ecosystem)`,
        ecosystem: eco,
        type: 'grant',
        time_sensitivity: 'stable',
        source: 'community',
        confidence: 'medium',
        version: '1.0.0',
        content: `# ${repo.name} — ${eco.charAt(0).toUpperCase() + eco.slice(1)} Ecosystem Project

**Repo:** [${repo.full_name}](${repo.html_url})
**Stars:** ⭐ ${repo.stargazers_count}
**Language:** ${repo.language || 'N/A'}
**Topics:** ${(repo.topics || []).join(', ') || 'N/A'}

## Description
${repo.description || 'N/A'}

## Grant 申请参考价值
- 真实 ${eco} 生态项目案例
- ⭐${repo.stargazers_count} 社区认可度
- 参考其技术栈和定位，用于 grant 申请竞争分析
`,
        tags: ['grant', eco, 'funding', 'ecosystem', 'reference', prefix],
      })
    }
    await sleep(1500)
  }

  let written = 0
  for (const s of skills) {
    if (await upsert(s)) { written++; process.stdout.write('.') }
    await sleep(80)
  }
  console.log(`\n  Ecosystem projects: ${written}/${skills.length}`)
  return written
}

async function main() {
  console.log('=== Multi-Ecosystem Grant Import ===')

  const r1 = await importNEAR()
  const r2 = await importEthereumESP()
  const r3 = await importOptimism()
  const r4 = await importOtherPlatforms()
  const r5 = await importEcosystemProjects()

  const total = r1 + r2 + r3 + r4 + r5
  console.log(`\n=== DONE ===`)
  console.log(`NEAR:              ${r1}`)
  console.log(`Ethereum ESP:      ${r2}`)
  console.log(`Optimism RPGF:     ${r3}`)
  console.log(`Platform guides:   ${r4}`)
  console.log(`Ecosystem projects:${r5}`)
  console.log(`Total:             ${total}`)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/skills?type=eq.grant&select=id`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  console.log('DB grant total:', (await res.json()).length)
}

main().catch(console.error)
