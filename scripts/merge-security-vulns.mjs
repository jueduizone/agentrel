#!/usr/bin/env node
/**
 * 将 303 条 security-vuln skills 合并为 ~15 条按漏洞类型归纳的 skill
 * 策略：
 * 1. 从 DB 拉出所有 security-vuln
 * 2. 按 tag 分类聚合（oracle-manipulation / access-control / reentrancy...）
 * 3. 每类生成 1 条新 skill（type=security，保留原始案例摘要）
 * 4. 删除原始 303 条（type=security-vuln）
 */
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 漏洞类型分类规则：tag → 类型
const VULN_TYPES = {
  'oracle-manipulation':  { id: 'security/oracle-manipulation',   name: 'Oracle 操纵漏洞' },
  'access-control':       { id: 'security/access-control',         name: '访问控制漏洞' },
  'reentrancy':           { id: 'security/reentrancy',              name: '重入攻击漏洞' },
  'dos':                  { id: 'security/dos',                     name: 'DoS 拒绝服务漏洞' },
  'storage-collision':    { id: 'security/storage-collision',       name: 'Storage 冲突漏洞' },
  'frontrunning':         { id: 'security/frontrunning',            name: '抢跑/三明治攻击漏洞' },
  'logic-error':          { id: 'security/logic-error',             name: '逻辑错误漏洞' },
  'integer-overflow':     { id: 'security/integer-overflow',        name: '整数溢出漏洞' },
  'signature-replay':     { id: 'security/signature-replay',        name: '签名重放漏洞' },
  'precision-loss':       { id: 'security/precision-loss',          name: '精度损失漏洞' },
  'delegatecall':         { id: 'security/delegatecall',            name: 'Delegatecall 漏洞' },
  'bridge-vuln':          { id: 'security/bridge-vuln',             name: '跨链桥漏洞' },
  'flash-loan':           { id: 'security/flash-loan',              name: 'Flash Loan 攻击' },
}

const DESCRIPTIONS = {
  'security/oracle-manipulation': 'Use when user asks about oracle manipulation, price manipulation attacks, TWAP bypass, or how to safely use price oracles in smart contracts.',
  'security/access-control': 'Use when user asks about access control vulnerabilities, unauthorized function calls, missing onlyOwner/onlyRole checks, or privilege escalation in smart contracts.',
  'security/reentrancy': 'Use when user asks about reentrancy attacks, cross-function reentrancy, read-only reentrancy, or how to prevent reentrancy in Solidity.',
  'security/dos': 'Use when user asks about denial-of-service vulnerabilities in smart contracts, gas griefing, block gas limit attacks, or unbounded loops.',
  'security/storage-collision': 'Use when user asks about storage collision vulnerabilities, proxy storage conflicts, delegatecall storage layout issues, or EIP-1967 storage slots.',
  'security/frontrunning': 'Use when user asks about front-running, sandwich attacks, MEV, transaction ordering attacks, or how to protect against mempool exploitation.',
  'security/logic-error': 'Use when user asks about smart contract logic errors, incorrect business logic, wrong state transitions, or subtle calculation bugs in DeFi protocols.',
  'security/integer-overflow': 'Use when user asks about integer overflow or underflow vulnerabilities, unsafe arithmetic, or how SafeMath/Solidity 0.8 protects against overflow.',
  'security/signature-replay': 'Use when user asks about signature replay attacks, missing nonce checks, cross-chain replay, or EIP-712 implementation security.',
  'security/precision-loss': 'Use when user asks about precision loss, rounding errors, division before multiplication issues, or fixed-point math vulnerabilities in DeFi.',
  'security/delegatecall': 'Use when user asks about delegatecall vulnerabilities, malicious delegate targets, context manipulation, or storage layout conflicts in proxy patterns.',
  'security/bridge-vuln': 'Use when user asks about cross-chain bridge vulnerabilities, message validation errors, or bridge hack case studies.',
  'security/flash-loan': 'Use when user asks about flash loan attacks, single-transaction exploits, or how to protect protocols against flash loan manipulation.',
}

async function upsert(skill) {
  const r = await fetch(BASE + '/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  if (!r.ok) { console.error('upsert error:', skill.id, await r.text()); return false }
  return true
}

async function deleteByType(type) {
  const r = await fetch(BASE + '/rest/v1/skills?type=eq.' + type, {
    method: 'DELETE',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'return=minimal' },
  })
  return r.ok
}

function extractSummary(content, maxLen = 300) {
  if (!content) return ''
  // 提取 ## 标题 + 紧跟的第一段内容
  const lines = content.split('\n').filter(l => l.trim())
  const key = []
  for (const l of lines.slice(0, 15)) {
    if (l.startsWith('**Impact') || l.startsWith('**Root') || l.startsWith('- **') || l.startsWith('**')) {
      key.push(l.replace(/\*\*/g, '').trim())
    }
  }
  return key.join(' | ').slice(0, maxLen)
}

async function main() {
  // 1. 拉出所有 security-vuln
  console.log('Fetching 303 security-vuln skills...')
  const r = await fetch(BASE + '/rest/v1/skills?type=eq.security-vuln&select=id,name,tags,content,ecosystem&limit=400', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  const vulns = await r.json()
  console.log('Fetched:', vulns.length)

  // 2. 按 tag 分类
  const groups = {}
  const uncategorized = []

  for (const v of vulns) {
    const tags = v.tags || []
    let matched = false
    for (const [tag, info] of Object.entries(VULN_TYPES)) {
      if (tags.includes(tag)) {
        if (!groups[tag]) groups[tag] = []
        groups[tag].push(v)
        matched = true
        break
      }
    }
    if (!matched) uncategorized.push(v)
  }

  console.log('\nCategory distribution:')
  for (const [tag, items] of Object.entries(groups)) {
    console.log(' ', tag, ':', items.length)
  }
  console.log('  uncategorized:', uncategorized.length)

  // 3. 每类生成合并 skill
  const newSkills = []
  for (const [tag, items] of Object.entries(groups)) {
    const info = VULN_TYPES[tag]
    
    // 提取代表性案例（最多 15 条）
    const cases = items.slice(0, 15).map(v => {
      const contest = v.id.split('/')[1] || 'unknown'
      const summary = extractSummary(v.content)
      return `### ${v.name}\n**来源：** ${contest}\n${summary ? summary + '\n' : ''}`
    }).join('\n')

    // 提取所有 content 里的关键防护建议（去重）
    const mitigations = new Set()
    for (const v of items) {
      const c = v.content || ''
      const lines = c.split('\n')
      for (const l of lines) {
        if (l.match(/mitigation|recommendation|fix|防护|建议|修复/i) && l.length > 20 && l.length < 200) {
          mitigations.add(l.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim())
        }
      }
    }
    const mitigationList = [...mitigations].slice(0, 8).map(m => `- ${m}`).join('\n')

    const content = `# ${info.name}

> 基于 Code4rena 审计比赛的 **${items.length} 个**真实案例分析（2022-2024）

## 漏洞概述

${getVulnOverview(tag)}

## 防护建议

${mitigationList || getDefaultMitigation(tag)}

## 真实案例（精选）

${cases}

## 统计
- **案例数量：** ${items.length}
- **严重级别：** ${items.filter(v=>(v.tags||[]).includes('high')).length} High / ${items.filter(v=>(v.tags||[]).includes('medium')).length} Medium
- **数据来源：** Code4rena (code4rena.com)
`

    newSkills.push({
      id: info.id,
      name: info.name,
      description: DESCRIPTIONS[info.id],
      ecosystem: 'ethereum',
      type: 'security',
      source: 'code4rena',
      confidence: 'high',
      version: '1.0.0',
      time_sensitivity: 'stable',
      tags: ['security', 'smart-contract', 'audit', 'code4rena', tag],
      content,
    })
  }

  // 处理 uncategorized — 合并为 general 类
  if (uncategorized.length > 0) {
    const cases = uncategorized.slice(0, 20).map(v => {
      const contest = v.id.split('/')[1] || 'unknown'
      return `- **${v.name}** (${contest})`
    }).join('\n')
    newSkills.push({
      id: 'security/other-vulns',
      name: '其他智能合约漏洞',
      description: 'Use when user asks about smart contract security issues not covered by specific categories. Contains miscellaneous findings from Code4rena audits.',
      ecosystem: 'ethereum',
      type: 'security',
      source: 'code4rena',
      confidence: 'high',
      version: '1.0.0',
      time_sensitivity: 'stable',
      tags: ['security', 'smart-contract', 'audit', 'code4rena'],
      content: `# 其他智能合约漏洞\n\n> 来自 Code4rena 的 ${uncategorized.length} 个未分类漏洞案例\n\n${cases}`,
    })
  }

  console.log(`\nWill create ${newSkills.length} merged skills, delete 303 original...`)

  // 4. 写入合并后的 skill
  console.log('Writing merged skills...')
  for (const s of newSkills) {
    const ok = await upsert(s)
    console.log((ok ? '✓' : '✗') + ' ' + s.id)
    await sleep(100)
  }

  // 5. 删除原始 303 条
  console.log('\nDeleting original security-vuln records...')
  const delOk = await deleteByType('security-vuln')
  console.log('Delete result:', delOk ? 'OK' : 'FAILED')

  // 6. 统计
  await sleep(500)
  const fin = await fetch(BASE + '/rest/v1/skills?type=in.(security,security-vuln)&select=id,type', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  const finData = await fin.json()
  const counts = {}
  for (const s of finData) counts[s.type] = (counts[s.type] || 0) + 1
  console.log('\nFinal security counts:', counts)
  console.log('Done!')
}

function getVulnOverview(tag) {
  const overviews = {
    'oracle-manipulation': `Oracle 操纵攻击通过在单笔交易内影响价格预言机读数，使协议以错误价格执行操作。\n\n**常见场景：**\n- 操纵 AMM spot price（TWAP 保护不足）\n- 闪贷配合操纵 price feed\n- 使用可被单区块操控的预言机`,
    'access-control': `访问控制漏洞指合约未正确限制关键函数的调用权限，导致未授权操作。\n\n**常见场景：**\n- 缺少 onlyOwner/onlyRole modifier\n- 初始化函数未设访问控制（可被任意调用）\n- 角色设置逻辑错误导致权限泄漏`,
    'reentrancy': `重入攻击在合约向外部地址发送 ETH/调用外部合约时，攻击者在回调中重新进入原合约。\n\n**常见场景：**\n- 单函数重入（经典 DAO 攻击模式）\n- 跨函数重入（A 函数操作被 B 函数重入）\n- Read-only 重入（读取中间状态进行操纵）`,
    'dos': `DoS 漏洞使合约正常功能被阻断，导致资金锁死或协议瘫痪。\n\n**常见场景：**\n- 遍历无界数组导致 gas 超限\n- 依赖 external call 成功（一个失败影响全体）\n- 强制向合约发 ETH 影响余额判断`,
    'storage-collision': `Storage 冲突发生在代理合约与实现合约使用相同 storage slot，导致变量相互覆盖。\n\n**常见场景：**\n- 代理合约 admin 变量与实现合约 slot 0 冲突\n- 多重继承导致 storage 布局不一致\n- EIP-1967 标准 slot 使用不当`,
    'frontrunning': `抢跑攻击通过监控内存池，在目标交易前插入自己的交易获利。\n\n**常见场景：**\n- DEX 交易被三明治攻击（夹子）\n- approve + transferFrom 被抢跑\n- NFT mint 价格被抢跑`,
    'logic-error': `逻辑错误是合约代码在语法上正确，但业务逻辑实现有缺陷。\n\n**常见场景：**\n- 状态更新顺序错误\n- 条件判断边界问题（off-by-one）\n- 复杂业务流中的状态遗漏`,
    'integer-overflow': `整数溢出/下溢在 Solidity 0.8 前非常常见，0.8 后默认 checked arithmetic。\n\n**常见场景：**\n- 使用 unchecked 块时的溢出\n- 自定义汇编中的溢出\n- 类型转换（uint256 → uint128）截断`,
    'signature-replay': `签名重放攻击使用历史上合法的签名在新的上下文中重复执行操作。\n\n**常见场景：**\n- 缺少 nonce 导致同一签名可多次使用\n- 跨链部署缺少 chainId 验证\n- 域分隔符（domain separator）实现错误`,
    'precision-loss': `精度损失发生在 Solidity 整数除法中，小数部分被截断导致计算结果不准确。\n\n**常见场景：**\n- 除法在乘法前执行导致精度损失\n- 小数值 token（低精度）的计算误差\n- 累计误差导致资金损失`,
    'delegatecall': `delegatecall 在调用者的上下文中执行目标代码，若目标不可信或 storage 布局不匹配会导致严重漏洞。\n\n**常见场景：**\n- 代理合约被指向恶意实现\n- 实现合约 selfdestruct 导致代理失效\n- storage slot 布局不一致`,
    'bridge-vuln': `跨链桥漏洞是 2022-2023 年最大损失来源，多次亿级美元攻击均来自桥接层。\n\n**常见场景：**\n- 消息验证不足（缺少 Merkle proof 验证）\n- 签名验证绕过\n- 重放跨链消息`,
    'flash-loan': `闪电贷攻击利用单笔交易内借贷-操纵-归还的原子性，无需本金即可操纵协议状态。\n\n**常见场景：**\n- 配合 oracle 操纵\n- 配合 reentrancy\n- 治理攻击（借代币投票）`,
  }
  return overviews[tag] || '详见下方真实案例。'
}

function getDefaultMitigation(tag) {
  const mitigations = {
    'oracle-manipulation': `- 使用 TWAP 而非 spot price\n- 设置价格合理性检查（deviation check）\n- 配合 Chainlink 等可信预言机双重验证`,
    'access-control': `- 使用 OpenZeppelin AccessControl 替代手写权限\n- 初始化函数必须加 initializer modifier\n- 定期审计角色权限分配`,
    'reentrancy': `- 遵循 CEI（Check-Effect-Interact）模式\n- 使用 ReentrancyGuard modifier\n- 避免在状态更新前调用外部合约`,
    'dos': `- 避免在循环中调用外部函数\n- 用 pull payment 替代 push payment\n- 设置合理的 gas limit`,
    'storage-collision': `- 使用 EIP-1967 标准 storage slot\n- 继承合约使用 storage gap 预留\n- 升级前用 hardhat-upgrades 验证 storage 兼容性`,
    'frontrunning': `- 关键操作使用 commit-reveal 方案\n- DEX 设置合理 slippage tolerance\n- 使用 Flashbots/私有交易池`,
    'logic-error': `- 完善边界条件测试（fuzz testing）\n- 关键业务逻辑写 invariant 测试\n- 引入外部审计`,
    'integer-overflow': `- 升级到 Solidity 0.8+\n- 使用 unchecked 时必须手动验证边界\n- 类型转换前检查值域`,
    'signature-replay': `- 使用 EIP-712 结构化签名（含 chainId + nonce）\n- 每次使用后标记 nonce 已用\n- 验证 domain separator 包含正确 chainId`,
    'precision-loss': `- 先乘后除\n- 使用高精度中间变量（1e18 scale）\n- 对低精度 token 特殊处理`,
    'delegatecall': `- 实现合约加 _disableInitializers()\n- 严格测试 storage layout 一致性\n- 使用 OpenZeppelin Upgrades 插件验证`,
    'bridge-vuln': `- 消息必须包含 Merkle proof 验证\n- 独立的多签验证层\n- 设置提款冷却期和限额`,
    'flash-loan': `- oracle 使用 TWAP 不可在单块内被操纵\n- 关键操作加重入保护\n- 治理攻击防护：快照投票权`,
  }
  return mitigations[tag] || '参考 OpenZeppelin 最佳实践。'
}

main().catch(console.error)
