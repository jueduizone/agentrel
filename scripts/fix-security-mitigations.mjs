#!/usr/bin/env node
/**
 * 修复 security skills 的防护建议段落
 * 将 Code4rena 原始 "Recommended Mitigation Steps" 替换为预写的高质量建议
 */
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const MITIGATIONS = {
  'security/reentrancy': `- 遵循 **CEI 原则**（Checks → Effects → Interactions）：先校验，再更新状态，最后调用外部合约
- 使用 OpenZeppelin \`ReentrancyGuard\` 的 \`nonReentrant\` modifier
- 避免在状态更新前向外部地址发送 ETH 或调用未知合约
- 注意 **Read-only 重入**：即使函数是 \`view\`，也可能在中间状态被读取，影响其他合约逻辑
- ERC777/ERC1155 的回调钩子是高风险点，接收这类 token 的合约需额外防护`,

  'security/oracle-manipulation': `- 使用 **TWAP**（时间加权均价）而非 spot price，至少 30 分钟窗口
- 设置价格偏差检查（deviation check）：如链上价格与预言机偏差超过 5% 则拒绝
- 配合 **Chainlink Price Feed** 做双重验证，单一来源易被操纵
- 在关键操作（清算、借贷）前检查价格是否在合理区间
- 避免在单个区块内完成"操纵+获利"的全流程，加入冷却期`,

  'security/access-control': `- 使用 OpenZeppelin \`AccessControl\` 或 \`Ownable\`，不要手写权限逻辑
- 初始化函数必须加 \`initializer\` modifier，防止被任意地址调用
- 关键函数（mint/pause/upgrade）必须有明确的角色限制
- 定期审计所有 \`public\`/\`external\` 函数，确认权限边界
- 使用多签（Gnosis Safe）管理 admin 权限，避免单点失败`,

  'security/dos': `- 避免在循环中调用外部函数或转账（pull-payment 替代 push-payment）
- 限制循环次数上限，防止无界循环耗尽 gas
- 不依赖 external call 必须成功（失败要有降级处理）
- 避免使用 \`address(this).balance\` 作为状态判断依据（可被强制发 ETH）
- 批量操作设计分页机制，允许多次调用完成`,

  'security/storage-collision': `- 使用 **EIP-1967** 标准 storage slot（随机 slot，避免冲突）
- 继承链中所有合约使用 \`__gap\` 预留 storage 空间（OZ Upgradeable 系列标配）
- 升级前用 \`hardhat-upgrades\` 或 \`@openzeppelin/upgrades-core\` 验证 storage 布局兼容性
- 代理合约和实现合约分开部署，确保 slot 0 不被双方同时使用
- Diamond Pattern 各 facet 统一使用独立的 diamond storage struct`,

  'security/frontrunning': `- 关键操作使用 **commit-reveal** 两阶段方案（先提交 hash，再揭示内容）
- DEX 交互设置合理 slippage tolerance（主流币 ≤0.5%，不要设置 0%）
- 使用 **Flashbots Protect RPC** 或 MEV Blocker 发送交易，绕过公开内存池
- 加入 \`deadline\` 参数限制交易有效期，防止过期交易被重放
- NFT mint 随机性不依赖 \`block.timestamp\`/\`blockhash\`，改用 Chainlink VRF`,

  'security/logic-error': `- 关键业务逻辑编写 **invariant 测试**（Foundry \`invariant_*\`），验证系统不变量始终成立
- 使用 **fuzz testing** 覆盖边界输入，尤其是 0、max uint256、极小值
- 状态机设计时显式定义所有合法状态转换，拒绝非法路径
- 复杂计算拆分为可独立验证的子函数，单独单测
- 引入外部审计，逻辑错误是人工审计最有价值的发现类型`,

  'security/integer-overflow': `- 升级到 **Solidity 0.8+**（默认 checked arithmetic，溢出自动 revert）
- 使用 \`unchecked\` 块时必须手动证明不会溢出（如 for 循环自增）
- 类型向下转换（\`uint256 → uint128\`）前检查值域：\`require(x <= type(uint128).max)\`
- 避免 \`int\` 与 \`uint\` 混用，类型转换隐患大
- 测试时特别覆盖 0、1、\`type(uint256).max\` 等边界值`,

  'security/signature-replay': `- 使用 **EIP-712** 结构化签名，domain separator 必须包含 \`chainId\` + 合约地址
- 每条签名必须绑定唯一 \`nonce\`，使用后立即标记已消费
- 跨链部署时确保 domain separator 在每条链上不同（\`block.chainid\` 动态获取）
- 验证签名时检查 \`signer == expectedSigner\`，不接受零地址
- 有时限的签名加入 \`deadline\` 字段，过期自动失效`,

  'security/precision-loss': `- 始终**先乘后除**：\`a * b / c\` 而非 \`a / c * b\`
- 使用 **1e18 精度**（WAD）或更高的中间变量进行计算
- 对低精度 token（6位小数如 USDC）特殊处理，避免与 18 位精度混算
- 设置最小操作金额门槛，防止精度损失导致零值攻击
- 使用 \`mulDiv\` 等防溢出的精确除法库（Uniswap FullMath / PRBMath）`,

  'security/delegatecall': `- 实现合约构造函数调用 \`_disableInitializers()\`，防止直接被初始化
- 严格保证代理合约与实现合约 **storage layout 一致**，使用工具验证
- 不要 delegatecall 到用户提供的地址，只允许白名单合约
- 实现合约禁止包含 \`selfdestruct\`（会让代理永久失效）
- 升级操作通过 timelock + multisig 执行，不允许单一 EOA 升级`,

  'security/flash-loan': `- 价格预言机使用 **TWAP** 而非 spot price，单块内无法操纵
- 关键状态修改函数加 \`nonReentrant\`，防止闪贷配合重入
- 治理快照基于历史区块而非当前区块（\`ERC20Votes\` 的 \`getPastVotes\`）
- 检测闪贷：同一区块内大额借入+归还是特征，可设置单块操作限额
- 敏感计算不依赖即时余额（\`token.balanceOf(address(this))\`），使用内部记账`,

  'security/bridge-vuln': `- 跨链消息必须包含完整的 **Merkle proof 验证**，不能仅凭签名数量
- 验证节点集合（validator set）必须来自可信来源，防止伪造
- 设置**提款冷却期**（24-72h）+ 单日提款限额，降低被盗后损失
- 多签验证器数量足够（≥⅔ 诚实假设），避免少数验证器控制
- 定期进行跨链消息格式和验证逻辑的专项审计`,
}

async function updateSkill(id, mitigationText) {
  // 获取当前 content
  const r = await fetch(`${BASE}/rest/v1/skills?select=id,content&id=eq.${encodeURIComponent(id)}&limit=1`, { headers: H })
  const [skill] = await r.json()
  if (!skill) { console.log('❌ not found:', id); return }

  // 替换防护建议段落
  const content = skill.content || ''
  const parts = content.split('## 防护建议')
  if (parts.length < 2) { console.log('⚠️  no section:', id); return }

  // 找到下一个 ## 分割
  const afterSection = parts[1]
  const nextH2 = afterSection.search(/\n## /)
  const before = parts[0]
  const after = nextH2 >= 0 ? afterSection.slice(nextH2) : ''

  const newContent = `${before}## 防护建议\n\n${mitigationText}\n${after}`

  // patch
  const p = await fetch(`${BASE}/rest/v1/skills?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ content: newContent, updated_at: new Date().toISOString() }),
  })
  console.log((p.ok ? '✅' : '❌') + ' ' + id)
}

async function main() {
  console.log('Fixing security skill mitigations...\n')
  for (const [id, text] of Object.entries(MITIGATIONS)) {
    await updateSkill(id, text)
    await new Promise(r => setTimeout(r, 80))
  }
  console.log('\nDone.')
}

main().catch(console.error)
