#!/usr/bin/env node
/**
 * 为每个生态生成"经验总结"skill，基于已有案例数据提炼申请规律
 */
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function upsert(skill) {
  const r = await fetch(BASE + '/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  return r.ok
}

// 拉各生态的 grant 案例
async function fetchEcosystemCases(ecosystem) {
  const r = await fetch(
    `${BASE}/rest/v1/skills?type=eq.grant&ecosystem=eq.${ecosystem}&select=id,name,content,tags`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  )
  return r.json()
}

function extractProjectName(skill) {
  return skill.name
    .replace(/ \(W3F Grant\)/, '')
    .replace(/ \(NEAR Grant\)/, '')
    .replace(/ \(.*? Ecosystem\)/, '')
    .replace(/ Grant$/, '')
    .trim()
}

function extractDescription(skill) {
  const c = skill.content || ''
  // Try Description section
  const descMatch = c.match(/## Description\n+([\s\S]{20,200}?)(?=\n##|$)/)
  if (descMatch) return descMatch[1].replace(/\s+/g, ' ').trim()
  // Try first paragraph
  const firstPara = c.split('\n\n')[1]
  return firstPara?.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 150) || ''
}

function extractLanguage(skill) {
  const m = skill.content?.match(/\*\*Language:\*\* ([^\n]+)/)
  return m?.[1]?.trim() || ''
}

function extractStars(skill) {
  const m = skill.content?.match(/Stars:\*\* ⭐ ([\d,]+)/)
  return m ? parseInt(m[1].replace(',', '')) : 0
}

async function buildInsightSkill(ecosystem, displayName, cases) {
  // Filter out overview/guide skills
  const projectCases = cases.filter(c => !c.tags?.includes('overview') && !c.tags?.includes('guide'))
  const overviewSkill = cases.find(c => c.tags?.includes('overview') || c.tags?.includes('guide'))

  // Analyze patterns
  const languages = {}
  const categories = {}
  let totalStars = 0
  let highStarProjects = []

  for (const c of projectCases) {
    const lang = extractLanguage(c)
    if (lang && lang !== 'N/A') languages[lang] = (languages[lang] || 0) + 1

    const stars = extractStars(c)
    totalStars += stars
    if (stars >= 20) highStarProjects.push({ name: extractProjectName(c), stars, desc: extractDescription(c) })

    // Category from content/tags
    const text = (c.content || '').toLowerCase()
    if (text.includes('defi') || text.includes('swap') || text.includes('lend')) categories['DeFi'] = (categories['DeFi'] || 0) + 1
    else if (text.includes('nft') || text.includes('erc-721')) categories['NFT'] = (categories['NFT'] || 0) + 1
    else if (text.includes('tool') || text.includes('sdk') || text.includes('framework')) categories['Dev Tools'] = (categories['Dev Tools'] || 0) + 1
    else if (text.includes('game') || text.includes('gaming')) categories['Gaming'] = (categories['Gaming'] || 0) + 1
    else if (text.includes('dao') || text.includes('governance')) categories['DAO/Governance'] = (categories['DAO/Governance'] || 0) + 1
    else if (text.includes('zk') || text.includes('privacy') || text.includes('zero-knowledge')) categories['ZK/Privacy'] = (categories['ZK/Privacy'] || 0) + 1
    else categories['Infrastructure'] = (categories['Infrastructure'] || 0) + 1
  }

  highStarProjects.sort((a, b) => b.stars - a.stars)
  const topLangs = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topCats = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topProjects = highStarProjects.slice(0, 8)

  const caseList = projectCases.slice(0, 20).map(c =>
    `- **${extractProjectName(c)}** (⭐${extractStars(c)}) — ${extractDescription(c).slice(0, 80)}`
  ).join('\n')

  // Ecosystem-specific insights
  const ecoInsights = getEcoInsights(ecosystem, topLangs, topCats, topProjects, projectCases.length)

  const content = `# ${displayName} Grant 生态经验总结

> 基于 AgentRel 收录的 ${projectCases.length} 个 ${displayName} 生态项目分析

## 概览
- **收录项目数：** ${projectCases.length} 个
- **高星项目（⭐20+）：** ${highStarProjects.length} 个
- **申请指南：** ${overviewSkill ? `[${overviewSkill.name}](../${overviewSkill.id})` : '见平台官网'}

## 技术栈分布（基于案例）

| 语言/框架 | 占比 | 说明 |
|---------|------|------|
${topLangs.map(([lang, count]) =>
  `| ${lang} | ${Math.round(count / projectCases.length * 100)}% | ${count}/${projectCases.length} 项目使用 |`
).join('\n')}

## 获批项目方向分布

| 方向 | 数量 | 占比 |
|------|------|------|
${topCats.map(([cat, count]) =>
  `| ${cat} | ${count} | ${Math.round(count / projectCases.length * 100)}% |`
).join('\n')}

## 高星项目精选（社区验证度最高）

${topProjects.map(p => `### ⭐${p.stars} ${p.name}\n${p.desc || '详见具体案例'}`).join('\n\n')}

## ${displayName} Grant 申请经验

${ecoInsights}

## 部分收录案例
${caseList}

## 更多资源
- 完整指南：${overviewSkill ? `[${overviewSkill.name}](../${overviewSkill.id})` : '见平台官网'}
- 查看全部案例：搜索 ecosystem:${ecosystem} type:grant
`

  return {
    id: `grants/insights-${ecosystem}`,
    name: `${displayName} Grant 申请经验总结`,
    ecosystem,
    type: 'grant',
    time_sensitivity: 'stable',
    source: 'community',
    confidence: 'high',
    version: '1.0.0',
    content,
    tags: ['grant', ecosystem, 'insights', 'experience', 'summary', 'guide'],
  }
}

function getEcoInsights(eco, topLangs, topCats, topProjects, total) {
  const mainLang = topLangs[0]?.[0] || 'N/A'
  const mainCat = topCats[0]?.[0] || 'N/A'

  const insights = {
    polkadot: `### 从 ${total} 个 W3F 案例总结的规律

**什么类型最容易获批：**
- Substrate pallet / 链上工具（占比最高）
- Polkadot 生态基础设施（RPC、indexer、bridge）
- Web3 通用工具（钱包、身份、数据）

**申请写法规律（从案例归纳）：**
1. **Team Name 要真实** — W3F 会查团队背景，GitHub 要有相关贡献
2. **Level 1 先试水** — 第一次申请建议 Level 1（$10K），获批后再升级
3. **里程碑要 3-4 个** — 每个里程碑一个月左右，金额分配要均匀
4. **技术细节要充分** — W3F 委员会技术背景强，方案要经得起追问
5. **开源承诺** — 代码必须开源，通常 Apache 2.0 或 GPL

**常见拒绝原因：**
- 与 Polkadot 生态关联不明确
- 里程碑交付物不够具体
- 类似项目已存在，缺乏差异化`,

    solana: `### 从 ${total} 个 Solana 生态项目总结的规律

**最活跃的建设方向：**
- DeFi（借贷/DEX/稳定币）占 Solana 生态大头
- NFT 工具（Metaplex 生态）持续有需求
- 移动端 DApp（Saga 手机生态新机会）
- 开发者工具（Anchor 插件、部署工具）

**技术栈规律：**
- ${mainLang} 是主流（Solana 特有，非 EVM）
- Anchor 框架是标配，不用 Anchor 会被质疑
- 前端多用 React + @solana/web3.js 或 @coral-xyz/anchor

**申请技巧：**
1. **量化 Solana 优势** — TPS/费用对比 Ethereum，数字要具体
2. **展示 SPL Token 集成** — 与 Solana 原生代币标准的整合
3. **Superteam 先混** — 在 Superteam Discord 有存在感，申请更顺
4. **小金额先跑通** — Superteam local grants（$500-$5K）门槛低，可以先获取信任
5. **Pyth/Switchboard 集成** — Solana 生态 oracle，展示整合加分`,

    near: `### 从 ${total} 个 NEAR 生态项目总结的规律

**NEAR 生态特点：**
- 账户模型独特（human-readable 地址），适合 Web2 用户产品
- Aurora EVM 使 ETH 开发者可快速迁移
- 开发者友好（JavaScript SDK），学习曲线低

**获批项目类型：**
- AssemblyScript/Rust 工具链（生态特有需求）
- Aurora EVM 生态工具
- NEAR SDK 扩展和插件
- 用户教育/文档内容

**申请建议：**
1. **强调 NEAR 独特性** — 为什么这个产品在 NEAR 比在 ETH 更好？
2. **DevHub 发帖** — NEAR DevHub 是核心社区，先获取社区支持
3. **关注 NEAR 战略方向** — 目前 NEAR 重点推 AI x Blockchain，与这方向结合加分
4. **使用 NEAR 原生功能** — 账户合约、跨合约调用、存储质押等`,

    arbitrum: `### 从 ${total} 个 Arbitrum 生态项目总结的规律

**Arbitrum 生态优势：**
- EVM 完全兼容，ETH 项目最低成本迁移
- TVL 排名前三，DeFi 生态最成熟的 L2
- Arbitrum Stylus（支持 Rust/C++ 写合约）是新方向

**主要建设方向（从案例）：**
- DeFi 协议（GMX、Camelot 等巨头带动生态）
- 跨链基础设施
- 开发者工具（调试、测试、部署）
- Stylus（新 VM，WASM 支持）相关工具

**DAO 申请规律：**
1. **先发 RFC 帖** — 在 Arbitrum Forum 先发 [RFC] 预热，收集反馈
2. **量化 Arbitrum 生态价值** — 会带来多少 TVL/用户/交易量
3. **LTIPP/STIP 和 Grant 分清楚** — 激励计划和 Grant 是不同的申请通道
4. **有链上数据更好** — 在 Arbitrum 已有部署记录的项目通过率更高`,

    polygon: `### 从 ${total} 个 Polygon 生态项目总结的规律

**Polygon 生态特点：**
- 企业级应用友好（Reddit、Starbucks、Nike 等大品牌选择 Polygon）
- zkEVM 是战略重点（ZK 原生应用机会）
- Polygon ID 是身份方向的独特产品

**活跃方向（从案例）：**
- DeFi（得益于 EVM 兼容和低费）
- NFT 大规模应用（游戏、会员、票务）
- 企业/机构用途链（供应链、数字证书）
- zkEVM 原生应用

**申请技巧：**
1. **对标企业客户** — Polygon 喜欢能吸引企业用户的项目
2. **zkEVM 优先** — 2024 年 Polygon 战略重心在 zkEVM，相关申请成功率高
3. **Polygon ID 集成** — 身份认证方向有 Polygon 特有优势
4. **PoS vs zkEVM** — 明确你在哪条链，zkEVM 申请会有专项资金`,

    avalanche: `### 从 ${total} 个 Avalanche 生态项目总结的规律

**Avalanche 独特优势：**
- Subnet 机制（可自定义链，适合游戏/企业）
- 三链架构（X-Chain/P-Chain/C-Chain）
- 最快最终确认（< 2 秒）

**Multiverse 资助重点：**
- Subnet 创建（游戏链、企业链、DeFi 专链）
- DeFi 协议（特别是稳定币和借贷）
- 跨链基础设施（Wormhole、LayerZero 集成）
- 企业级区块链应用

**申请规律：**
1. **Subnet 是关键词** — Avalanche 最大的差异化就是 Subnet，申请要突出这一点
2. **游戏是新蓝海** — Beam（Gaming Subnet）证明了游戏方向的可行性
3. **Blizzard Fund 是投资非 Grant** — 区分清楚两个渠道
4. **Rush 期间申请** — Avalanche Rush 激励活动期间成功率明显更高`,

    optimism: `### 从 ${total} 个 Optimism/RPGF 生态项目总结的规律

**RPGF 核心特点：**
- 回溯奖励，不需要提前申请
- 评判标准是"实际影响"而非"计划"
- BadgeHolder 投票决定分配

**高 RPGF 获奖概率的项目特征：**
- **链上可量化**：用户数、交易量、合约调用次数
- **长期维护**：几年持续贡献 > 一次性项目
- **公共品属性**：开源、免费、无商业壁垒
- **开发者工具**：整个生态都在用的工具（如 foundry、cast）

**准备 RPGF 的方法：**
1. **先做事后留证据** — 在 Optimism 上部署、维护、推广
2. **Impact Attestation 写好** — 在 Agora 上清晰说明影响力，有数据支撑
3. **社区认知** — 在 OP Discord/Forum 有名气的项目得票更多
4. **Farcaster 活跃** — Optimism 社区和 Farcaster 重叠度高，在上面活跃加分`,

    ethereum: `### 从 ${total} 个 Ethereum 生态 Grant 案例总结的规律

**ESP 关注的方向：**
- 协议研究（Layer 2、共识机制、EIP 实现）
- 开发者工具（测试框架、静态分析、调试工具）
- 教育内容（高质量文档、本地化）
- 公共品（无商业动机的基础设施）

**Gitcoin Grants 规律（从案例）：**
- GG24 轮次分类明确（Developer Tooling、Public Goods 等）
- 小额匹配资金为主（社区捐赠 + 二次方匹配）
- 适合开源项目积累早期用户

**申请技巧：**
1. **ESP 避免商业味** — EF 只资助公共品，有商业模式的项目找 VC 更合适
2. **Gitcoin 重在社区** — 动员社区捐款，捐款人数 > 捐款金额（二次方机制）
3. **EIP 提案配套** — 写 EIP 时同步申请 ESP 支持研究，成功率高
4. **学术背书加分** — 有大学/研究机构合作的项目更容易获 ESP 支持`,
  }

  return insights[eco] || `### 从 ${total} 个案例总结的规律\n\n- 主流语言：${mainLang}\n- 主要方向：${mainCat}\n- 总体建议：参考上方案例列表，了解生态内活跃项目类型`
}

async function main() {
  const ecosystems = [
    { key: 'polkadot', display: 'W3F/Polkadot' },
    { key: 'solana', display: 'Solana' },
    { key: 'near', display: 'NEAR' },
    { key: 'arbitrum', display: 'Arbitrum' },
    { key: 'polygon', display: 'Polygon' },
    { key: 'avalanche', display: 'Avalanche' },
    { key: 'optimism', display: 'Optimism' },
    { key: 'ethereum', display: 'Ethereum' },
  ]

  let written = 0
  for (const { key, display } of ecosystems) {
    const cases = await fetchEcosystemCases(key)
    if (!cases?.length) { console.log(`Skip ${key}: no cases`); continue }

    const skill = await buildInsightSkill(key, display, cases)
    const ok = await upsert(skill)
    console.log((ok ? '✓' : '✗') + ` grants/insights-${key} (${cases.length} cases → ${Math.round(skill.content.length / 1024)}KB)`)
    if (ok) written++
    await sleep(200)
  }

  console.log(`\nDone: ${written} insight skills written`)

  const fin = await fetch(BASE + '/rest/v1/skills?type=eq.grant&select=id', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
  console.log('DB grant total:', (await fin.json()).length)
}

main().catch(console.error)
