#!/usr/bin/env node
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_KEY'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function upsert(skill) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/skills', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  return r.ok
}

function extractInfo(grant) {
  const c = grant.content || ''
  const teamMatch = c.match(/Team Name[:\*\s]+([^\n]+)/)
  const levelMatch = c.match(/Level[:\*\s\[]+([^\n\]]+)/)
  const overviewMatch = c.match(/Project Overview[^\n]*\n([\s\S]{50,400}?)(?=##|\n\n\n)/)
  return {
    name: grant.name.replace(' (W3F Grant)', '').replace(' (NEAR Grant)', '').replace(' Grant', ''),
    id: grant.id,
    team: teamMatch?.[1]?.trim().slice(0, 50) || '',
    level: levelMatch?.[1]?.trim().replace(/[^\w\s$]/g, '').trim().slice(0, 30) || '',
    summary: overviewMatch?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) || '',
  }
}

async function main() {
  const data = JSON.parse(readFileSync('/tmp/grants-all.json'))

  const w3f = data.filter(d => (d.tags || []).includes('w3f'))
  const near = data.filter(d => (d.tags || []).includes('near'))
  const gitcoin = data.filter(d => (d.tags || []).includes('gitcoin'))
  const eth = data.filter(d => (d.tags || []).includes('ethereum'))

  console.log(`W3F: ${w3f.length}, NEAR: ${near.length}, Gitcoin: ${gitcoin.length}, ETH: ${eth.length}`)

  // ─── W3F Overview ───
  const w3fInfos = w3f.map(extractInfo)
  const w3fTopCases = w3fInfos.slice(0, 15).map(g =>
    `- **${g.name}** (${g.level || 'Level ?'}): ${g.summary.slice(0, 120) || '详见具体案例'}`
  ).join('\n')
  const w3fAllList = w3fInfos.map((g, i) => `${i + 1}. **${g.name}** — ${g.id}`).join('\n')

  const w3fContent = `# Web3 Foundation (W3F) Grants 完整指南

> 生态总览 + ${w3f.length} 个已获批案例

## 什么是 W3F Grants？
Web3 Foundation 是 Polkadot/Substrate 生态最重要的资助项目，支持基础设施、工具、协议层建设。

## 资助等级
| 等级 | 最高金额 | 适合 |
|------|---------|------|
| 🐣 Level 1 | $10,000 | 个人开发者/小团队/PoC |
| 🐦 Level 2 | $30,000 | 有技术积累的团队 |
| 🦅 Level 3 | $150,000 | 完整产品路线图 |

## 申请流程
1. Fork [W3F Grants Program](https://github.com/w3f/Grants-Program)
2. 复制 \`applications/application-template.md\`
3. 填写提案（团队/项目描述/里程碑/预算）
4. 提交 PR → W3F 委员会审核（通常 2-4 周）
5. PR 合并 = 接受，按里程碑完成分批付款

## 成功申请的关键要素
- **技术可行性 > 创意** — 需要清晰可执行的技术方案
- **里程碑要具体可验证** — 每个阶段有明确交付物（代码/文档/测试）
- **团队背景** — GitHub 活跃度、过往 Web3 项目经验
- **与 Polkadot/Substrate 生态强相关** — 纯以太坊项目申请 W3F 会被拒

## 精选获批案例（前 15 个）

${w3fTopCases}

## 全部 ${w3f.length} 个已获批项目
${w3fAllList}

## 参考资源
- 官方 Repo: https://github.com/w3f/Grants-Program
- 申请模板: https://github.com/w3f/Grants-Program/blob/master/applications/application-template.md
- 已接受列表: https://grants.web3.foundation/applications
`

  // ─── NEAR Overview ───
  const nearInfos = near.map(extractInfo)
  const nearTopCases = nearInfos.slice(0, 8).map(g =>
    `- **${g.name}**: ${g.summary.slice(0, 150) || '详见具体案例'}`
  ).join('\n')

  const nearContent = `# NEAR Foundation Grants 完整指南

> 生态总览 + ${near.length} 个已获批案例

## 什么是 NEAR Grants？
NEAR Foundation 资助在 NEAR Protocol 生态上建设的团队，涵盖 DeFi、NFT、工具、基础设施等。

## 资助方向
- DeFi / AMM / 借贷协议
- 开发者工具 / SDK / 文档
- NFT / 游戏 / 社交应用
- Aurora EVM 生态（EVM 兼容层）
- 跨链桥接 / 互操作性

## 申请入口
- NEAR Foundation: https://near.foundation/grants/
- DevDAO Grants: https://devdao.near.foundation
- Aurora Grants: https://aurora.dev/grants

## 精选获批案例（前 8 个）

${nearTopCases}

## 全部 ${near.length} 个已获批项目
${nearInfos.map((g, i) => `${i + 1}. **${g.name}** — ${g.id}`).join('\n')}

## 申请建议
- 强调 NEAR 特有优势（极低 gas、账户模型、人类可读地址）
- 展示 NEAR 生态整合（Aurora / Octopus Network / Ref Finance）
- 里程碑建议 3-4 个阶段，每阶段 4-8 周
- 社区参与：在 NEAR Gov Forum 发帖获得曝光
`

  // ─── Cross-platform overview ───
  const crossContent = `# Web3 Grants 全景指南（多平台对比）

> 帮你找到最合适的 Grant 平台

## 主流平台一览

| 平台 | 生态 | 最高金额 | 最适合 | 申请难度 |
|------|------|---------|--------|---------|
| **W3F Grants** | Polkadot/Substrate | $150K | 基础设施/工具/协议 | ⭐⭐⭐ |
| **NEAR Grants** | NEAR Protocol | ~$50K | DApp/工具/内容 | ⭐⭐ |
| **Ethereum Foundation ESP** | Ethereum | 不限 | 研究/协议/公共品 | ⭐⭐⭐⭐ |
| **Gitcoin Grants** | 多链 | 社区捐赠 | 开源项目 | ⭐ |
| **Chainlink BUILD** | 多链 | 服务+资源 | Chainlink 集成项目 | ⭐⭐ |
| **Optimism RPGF** | Optimism | 不限 | 公共品/基础设施 | ⭐⭐ |
| **Arbitrum DAO** | Arbitrum | 不限 | 生态建设 | ⭐⭐⭐ |
| **Polygon Grant** | Polygon | ~$100K | DApp/工具 | ⭐⭐ |
| **Base Ecosystem Fund** | Base | 不限 | Base 生态项目 | ⭐⭐ |

## AgentRel 收录案例数
- W3F: **${w3f.length}** 个案例 → \`grants/overview-w3f\`
- NEAR: **${near.length}** 个案例 → \`grants/overview-near\`
- Gitcoin: **${gitcoin.length}** 个案例
- Ethereum ESP: **${eth.length}** 个案例

## 选择平台的决策树

\`\`\`
你在建什么？
├── Polkadot/Substrate 相关 → W3F Grants (最高 $150K)
├── NEAR 生态 DApp/工具 → NEAR Foundation Grants
├── 以太坊研究/协议层 → Ethereum Foundation ESP
├── 跨链/多链/开源 → Gitcoin Grants (社区匹配捐赠)
├── 用了 Chainlink → Chainlink BUILD Program
├── Optimism 上的公共品 → RPGF (无需申请，回溯发放)
├── Arbitrum 生态 → Arbitrum DAO Treasury
└── Base 生态 → Base Ecosystem Fund
\`\`\`

## 通用申请建议
1. **问题定义要清晰** — 一句话说清楚解决什么问题、给谁用
2. **里程碑要可验证** — 每个阶段有具体交付物，避免模糊描述
3. **预算要合理** — 参考同类项目，过高或过低都会被质疑
4. **团队背景** — GitHub 活跃度、过往 Web3 项目经验是加分项
5. **社区参与** — 提前在论坛发讨论帖，获得社区认可
6. **生态契合度** — 展示你的项目如何增强目标生态系统的价值

## 常见拒绝原因
- 技术方案不清晰，只有想法没有实现路径
- 里程碑过于模糊（"开发完成"不是里程碑）
- 预算虚高，没有合理说明
- 与生态关联薄弱
- 团队没有相关经验
`

  const skills = [
    {
      id: 'grants/overview-w3f',
      name: 'W3F Grants 完整指南（含 ' + w3f.length + ' 个案例）',
      ecosystem: 'polkadot',
      type: 'grant',
      time_sensitivity: 'stable',
      source: 'community',
      confidence: 'high',
      version: '2.0.0',
      content: w3fContent,
      tags: ['grant', 'w3f', 'polkadot', 'funding', 'overview', 'guide'],
    },
    {
      id: 'grants/overview-near',
      name: 'NEAR Grants 完整指南（含 ' + near.length + ' 个案例）',
      ecosystem: 'near',
      type: 'grant',
      time_sensitivity: 'stable',
      source: 'community',
      confidence: 'high',
      version: '2.0.0',
      content: nearContent,
      tags: ['grant', 'near', 'funding', 'overview', 'guide'],
    },
    {
      id: 'grants/overview-all-platforms',
      name: 'Web3 Grants 全景指南（多平台对比）',
      ecosystem: 'multi-chain',
      type: 'grant',
      time_sensitivity: 'stable',
      source: 'community',
      confidence: 'high',
      version: '1.0.0',
      content: crossContent,
      tags: ['grant', 'funding', 'overview', 'guide', 'w3f', 'near', 'ethereum', 'gitcoin', 'optimism', 'arbitrum'],
    },
  ]

  for (const s of skills) {
    const ok = await upsert(s)
    console.log((ok ? '✓' : '✗') + ' ' + s.id + ' (' + Math.round(s.content.length / 1024) + 'KB)')
    await sleep(100)
  }
  console.log('Done')
}

main().catch(console.error)
