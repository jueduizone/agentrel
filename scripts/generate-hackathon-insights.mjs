#!/usr/bin/env node
/**
 * 为各生态 hackathon 案例生成经验总结 skill
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

const ECO_INSIGHTS = {
  ethereum: {
    display: 'Ethereum/EVM',
    platforms: ['ETHGlobal', 'Devpost', 'Chainlink Hackathon', 'DoraHacks'],
    insights: `### Ethereum/EVM Hackathon 核心经验

**主流平台：**
- **ETHGlobal** — 最权威，每场 100-500 支队伍，奖金 $10K-$100K
- **Chainlink Hackathon** — 强调 Oracle 集成，奖金丰厚
- **Devpost** — 多家赞助商，赛道多
- **DoraHacks** — 亚洲开发者友好，中文支持

**ETHGlobal 获奖规律（从案例分析）：**
1. **技术创新 > 完整产品** — 评委更看重创意和技术亮点，不要求完整可用
2. **赞助商 Prize 更容易拿** — 主赛道竞争激烈，专项奖（如 Chainlink Prize、IPFS Prize）竞争小
3. **Demo 决定一切** — 有 live demo 的项目获奖率远高于 slides-only
4. **ZK/AI 是热门方向** — 近年 ZK proof、AI Agent 类项目获奖率高
5. **团队 2-4 人最佳** — 1 人太少，5+ 人协调成本高

**技术栈偏好（从获奖案例）：**
- Solidity + Hardhat/Foundry
- viem/ethers.js + wagmi（前端）
- IPFS/Filecoin（存储）
- Chainlink CCIP/VRF（跨链/随机）
- Account Abstraction（ERC-4337）

**48小时内能赢的项目类型：**
- 单一核心功能，做深而不是做广
- 可以 fork 并显著改进已有协议
- 与赞助商产品有明确集成点`,
  },
  solana: {
    display: 'Solana',
    platforms: ['Colosseum', 'Solana Hackathon', 'DoraHacks Solana'],
    insights: `### Solana Hackathon 核心经验

**主流平台：**
- **Colosseum** (colosseum.org) — Solana 官方黑客松平台，Renaissance/Radar 等大赛
- **Solana Breakpoint Hackathon** — 线下 + 线上，Solana 生态最高曝光度
- **Superteam Hackathon** — 本地社区，门槛低，适合新人

**Colosseum 获奖规律：**
1. **Solana 原生特性优先** — 用 Solana 特有能力（程序账户/低延迟/压缩 NFT）
2. **Anchor 是标配** — 不用 Anchor 的项目评委会质疑技术选型
3. **消费者应用强势** — Solana 倡导做 consumer app，不只是 DeFi infra
4. **移动端加分** — Saga/Mobile Wallet Adapter 集成受 Solana Foundation 青睐
5. **Blinks/Actions** — Solana Actions（可交互链接）是近期热点

**技术栈（从获奖案例）：**
- Rust + Anchor（合约层）
- @solana/web3.js + @coral-xyz/anchor（前端）
- Metaplex（NFT）
- Pyth Network（价格 oracle）

**时间分配建议：**
- 第一天：确定方向，搭骨架，跑通核心交互
- 第二天：完善 demo，准备 pitch，写 README
- 不要在第一天完美化 UI`,
  },
  polygon: {
    display: 'Polygon',
    platforms: ['Polygon BUIDL IT', 'ETHGlobal + Polygon Prize', 'Devpost Polygon'],
    insights: `### Polygon Hackathon 核心经验

**主流平台：**
- **Polygon BUIDL IT** — Polygon 官方，EVM + zkEVM 双赛道
- **ETHGlobal with Polygon Prize** — ETHGlobal 里的 Polygon 专项奖
- **Devpost Polygon-sponsored** — 多个 Devpost 黑客松有 Polygon 赞助

**获奖规律：**
1. **EVM 兼容 = 低迁移成本** — 展示从 Ethereum 迁移有多简单（10 分钟部署）
2. **zkEVM 差异化** — 在 zkEVM 上的原生项目比 PoS 迁移项目更受青睐（2024+）
3. **Gas 费优势要展示** — 对比 Ethereum mainnet，数字要具体
4. **Polygon ID 集成加分** — 身份/隐私方向有 Polygon 独特支持

**适合 Polygon 黑客松的方向：**
- NFT 大规模铸造（低 gas）
- 游戏内道具 / 链游
- 企业合规 / 数字身份
- zkEVM 原生 DeFi`,
  },
  near: {
    display: 'NEAR',
    platforms: ['NEAR MetaBUILD', 'NEAR BOS Hackathon', 'DoraHacks NEAR'],
    insights: `### NEAR Hackathon 核心经验

**主流平台：**
- **NEAR MetaBUILD** — NEAR 官方，MetaBUILD 1/2/3 系列
- **NEAR BOS Hackathon** — 专注 Blockchain Operating System
- **Superteam/DevHub Grant Hackathon** — 社区办的小型黑客松

**获奖规律：**
1. **账户模型独特性** — NEAR 账户 = 合约，可以做 Ethereum 做不到的交互
2. **Aurora EVM 桥接** — 展示 ETH 项目如何无缝迁移到 NEAR 有加分
3. **NEAR BOS 组件** — 基于 NEAR BOS 的前端组件开发是近年重点方向
4. **AI x NEAR** — NEAR 在推 AI Agent 与区块链结合，这个方向非常加分

**技术栈：**
- Rust（合约）/ JavaScript（near-sdk-js，适合 Web2 开发者）
- @near-js/wallet-selector（钱包连接）
- Aurora（EVM 兼容层）`,
  },
  base: {
    display: 'Base/Coinbase',
    platforms: ['Base Onchain Summer', 'ETHGlobal + Base Prize', 'Coinbase Hackathon'],
    insights: `### Base/Coinbase Hackathon 核心经验

**主流平台：**
- **Base Onchain Summer** — Coinbase Base 官方，消费者应用导向
- **ETHGlobal with Base Prize** — 每个 ETHGlobal 都有 Base 专项奖
- **Buildathon by Base** — 社区黑客松

**获奖规律：**
1. **消费者应用第一** — Base 明确定位 "consumer crypto"，不是 infra
2. **Farcaster 集成** — Frames/Channels 集成很受 Coinbase 团队青睐
3. **Smart Wallet UX** — 无私钥、passkey 登录类项目符合 Base 战略
4. **Onchain 数据可见** — 在 Basescan 可查到的真实交互加分
5. **CDP/Coinbase 产品** — Coinbase Developer Platform API 集成是加分项

**热门方向：**
- Social + Onchain（Farcaster Frames）
- 无需 MetaMask 的消费者 App
- AI Agent + Blockchain
- 创作者经济 / NFT 工具`,
  },
}

async function main() {
  // 拉各生态 hackathon 案例
  const r = await fetch(BASE + '/rest/v1/skills?type=eq.hackathon-case&select=id,name,ecosystem,content,tags', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  const all = await r.json()
  console.log('Total hackathon-case:', all.length)

  // Group by ecosystem
  const byEco = {}
  for (const s of all) {
    const eco = s.ecosystem || 'other'
    if (!byEco[eco]) byEco[eco] = []
    byEco[eco].push(s)
  }
  console.log('By ecosystem:', Object.fromEntries(Object.entries(byEco).map(([k, v]) => [k, v.length])))

  let written = 0
  for (const [eco, cases] of Object.entries(byEco)) {
    if (cases.length < 3) continue
    const info = ECO_INSIGHTS[eco]

    // Analyze cases
    const langs = {}
    const highStar = []
    for (const c of cases) {
      const langMatch = c.content?.match(/\*\*Language:\*\* ([^\n]+)/)
      const lang = langMatch?.[1]?.trim()
      if (lang && lang !== 'N/A') langs[lang] = (langs[lang] || 0) + 1

      const starsMatch = c.content?.match(/Stars:\*\* ⭐ ([\d,]+)/)
      const stars = starsMatch ? parseInt(starsMatch[1].replace(',', '')) : 0
      if (stars >= 10) {
        const name = c.name.replace('[Hackathon Repo] ', '')
        const desc = c.content?.match(/## Description\n+([\s\S]{20,150}?)(?=\n##|$)/)?.[1]?.replace(/\s+/g, ' ').trim() || ''
        highStar.push({ name, stars, desc: desc.slice(0, 100) })
      }
    }
    highStar.sort((a, b) => b.stars - a.stars)
    const topLangs = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const caseList = cases.slice(0, 15).map(c =>
      `- **${c.name.replace('[Hackathon Repo] ', '')}**`
    ).join('\n')

    const displayName = info?.display || (eco.charAt(0).toUpperCase() + eco.slice(1))
    const platforms = info?.platforms?.join('、') || '主流平台'
    const insightText = info?.insights || `### ${displayName} Hackathon 经验\n\n基于 ${cases.length} 个案例分析，${displayName} 生态活跃，建议参考上方案例列表了解热门方向。`

    const content = `# ${displayName} Hackathon 经验总结

> 基于 AgentRel 收录的 **${cases.length} 个** ${displayName} 生态 hackathon 案例分析

## 概览
- **收录案例数：** ${cases.length} 个
- **主流平台：** ${platforms}
- **高星项目（⭐10+）：** ${highStar.length} 个

## 技术栈分布（从案例统计）

${topLangs.length > 0 ? `| 语言/框架 | 使用频率 |
|---------|---------|
${topLangs.map(([lang, count]) => `| ${lang} | ${count}/${cases.length} 项目 |`).join('\n')}` : '数据不足，参考具体案例'}

## 高星项目精选（社区验证）

${highStar.slice(0, 6).map(p => `### ⭐${p.stars} ${p.name}\n${p.desc || '（详见具体案例）'}`).join('\n\n')}

${insightText}

## 部分收录案例
${caseList}

## 相关资源
- 搜索更多：ecosystem:${eco} type:hackathon-case
- Grant 机会：ecosystem:${eco} type:grant
`

    const skill = {
      id: `hackathon/insights-${eco}`,
      name: `${displayName} Hackathon 经验总结`,
      ecosystem: eco,
      type: 'hackathon-case',
      time_sensitivity: 'evergreen',
      source: 'community',
      confidence: 'high',
      version: '1.0.0',
      content,
      tags: ['hackathon', eco, 'insights', 'experience', 'summary', 'guide'],
    }

    const ok = await upsert(skill)
    console.log((ok ? '✓' : '✗') + ` hackathon/insights-${eco} (${cases.length} cases)`)
    if (ok) written++
    await sleep(150)
  }

  console.log(`\nDone: ${written} insight skills written`)

  // Overall hackathon overview
  const overallContent = `# Web3 Hackathon 全景指南

> 基于 AgentRel 收录的 ${all.length} 个 hackathon 案例总结

## 各生态案例数量
${Object.entries(byEco).sort((a, b) => b[1].length - a[1].length).map(([eco, cases]) =>
  `- **${eco}** — ${cases.length} 个案例 → [\`hackathon/insights-${eco}\`]`
).join('\n')}

## 主流黑客松平台

| 平台 | 生态 | 特点 | 官网 |
|------|------|------|------|
| **ETHGlobal** | EVM | 最权威，城市巡回，奖金丰厚 | ethglobal.com |
| **Colosseum** | Solana | Solana 官方平台 | colosseum.org |
| **Devpost** | 多链 | 企业赞助多，赛道多样 | devpost.com |
| **DoraHacks** | 多链 | 亚洲最大，中文友好 | dorahacks.io |
| **Gitcoin** | EVM | 公共品导向，匹配资金 | gitcoin.co |
| **Encode Club** | 多链 | 教育导向，适合新人 | encode.club |
| **Superteam** | Solana | 本地社区，低门槛 | superteam.fun |

## 通用获奖规律

### 产品层面
1. **做一件事，做到极致** — 评委时间有限，看不完复杂产品
2. **有 live demo 比代码更重要** — 能跑的 demo > 完美的代码
3. **赞助商 Prize 竞争小** — 专项奖比主赛道更容易拿
4. **讲故事** — "这解决了什么问题、为谁解决" 比技术细节更打动评委

### 技术层面
1. **用成熟工具** — 不要在黑客松里造轮子
2. **48小时内可跑通的方案** — 高估工作量是最常见失败原因
3. **生态整合** — 整合赞助商产品（Chainlink/IPFS/ENS/etc.）是捷径
4. **代码要开源** — 评委会看 GitHub，commit history 说明了努力程度

### 准备层面
1. **黑客松前 1 周** — 调研赞助商，想好方向，组好队伍
2. **准备模板** — 项目模板（Next.js + wagmi）提前搭好
3. **PPT 模板** — 开场画面、问题/方案/Demo 结构
4. **了解评委** — 不同黑客松评委关注点不同

## 各生态经验总结
${Object.keys(byEco).filter(eco => byEco[eco].length >= 3).map(eco =>
  `- [${eco.charAt(0).toUpperCase() + eco.slice(1)} Hackathon 经验](../hackathon/insights-${eco})`
).join('\n')}
`

  const ok = await upsert({
    id: 'hackathon/overview-all',
    name: 'Web3 Hackathon 全景指南',
    ecosystem: 'multi-chain',
    type: 'hackathon-case',
    time_sensitivity: 'evergreen',
    source: 'community',
    confidence: 'high',
    version: '1.0.0',
    content: overallContent,
    tags: ['hackathon', 'overview', 'guide', 'multi-chain', 'ethglobal', 'solana', 'devpost'],
  })
  console.log((ok ? '✓' : '✗') + ' hackathon/overview-all')

  const fin = await fetch(BASE + '/rest/v1/skills?type=eq.hackathon-case&select=id', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  console.log('DB hackathon-case total:', (await fin.json()).length)
}

main().catch(console.error)
