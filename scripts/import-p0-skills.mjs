#!/usr/bin/env node
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function upsert(skill) {
  const r = await fetch(BASE + '/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...skill, version: '1.0.0', time_sensitivity: 'stable', updated_at: new Date().toISOString() }),
  })
  if (!r.ok) console.error('error:', skill.id, await r.text())
  return r.ok
}

const SKILLS = [

// ============================================================
// 1. GAS 优化
// ============================================================
{
  id: 'ethereum/gas-optimization',
  name: 'Solidity Gas 优化指南',
  description: 'Use when user asks about gas optimization in Solidity, how to reduce transaction costs, storage layout tricks, or calldata optimization techniques.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['gas', 'optimization', 'solidity', 'storage', 'ethereum', 'performance'],
  content: `# Solidity Gas 优化指南

## Storage 优化（最大收益）

### 变量打包（Variable Packing）
\`\`\`solidity
// ❌ 差：3 个 slot（每个 slot 32 bytes）
uint256 a;  // slot 0
uint128 b;  // slot 1（浪费 128 bits）
uint128 c;  // slot 2（浪费 128 bits）

// ✅ 好：2 个 slot
uint256 a;  // slot 0
uint128 b;  // slot 1 前半
uint128 c;  // slot 1 后半（自动打包）
\`\`\`
**规则：** 相邻的小类型变量会被打包到同一个 slot，按声明顺序。

### 使用 bytes32 替代 string（固定长度）
\`\`\`solidity
// ❌ string 存储动态长度，至少 1 slot + 内容
string public name;

// ✅ bytes32 固定 1 slot，适合短字符串
bytes32 public name;
\`\`\`

### 减少 SSTORE/SLOAD（最贵操作）
| 操作 | Gas |
|------|-----|
| SSTORE（冷存储，首次写） | 20,000 |
| SSTORE（热存储，已写过） | 2,900 |
| SLOAD（冷读） | 2,100 |
| SLOAD（热读） | 100 |

\`\`\`solidity
// ❌ 多次读同一 storage 变量
function bad() external {
  for (uint i = 0; i < arr.length; i++) {  // arr.length 每次读 storage
    total += arr[i];
  }
}

// ✅ 缓存到 memory
function good() external {
  uint len = arr.length;  // 读一次存 memory
  for (uint i = 0; i < len; i++) {
    total += arr[i];
  }
}
\`\`\`

## Calldata vs Memory

\`\`\`solidity
// ❌ memory 会复制数据（多余的内存操作）
function process(uint[] memory data) external { ... }

// ✅ calldata 直接读取，不复制（外部函数只读参数用 calldata）
function process(uint[] calldata data) external { ... }
\`\`\`

## unchecked 算术（Solidity 0.8+）

\`\`\`solidity
// ❌ checked 算术（每次运算加溢出检查，+20 gas）
for (uint i = 0; i < 100; i++) { ... }

// ✅ 确保不溢出时用 unchecked
for (uint i = 0; i < 100;) {
  // ... 循环体
  unchecked { i++; }  // 省 ~30 gas / 次
}
\`\`\`

## 自定义错误 vs require string

\`\`\`solidity
// ❌ require string 部署和调用都更贵
require(amount > 0, "Amount must be positive");

// ✅ 自定义错误（Solidity 0.8.4+）更省 gas
error InvalidAmount();
if (amount == 0) revert InvalidAmount();
\`\`\`

## 事件替代存储（只需历史记录时）

\`\`\`solidity
// ❌ 存储所有历史记录（极贵）
Transfer[] public history;

// ✅ emit 事件（375 gas vs 20000 gas）
event Transfer(address indexed from, address indexed to, uint256 amount);
emit Transfer(from, to, amount);
\`\`\`

## 函数可见性优化

\`\`\`solidity
// public 生成两个入口（internal + external），external 更省 gas
// ✅ 只被外部调用时用 external
function transfer(address to, uint256 amount) external { ... }
\`\`\`

## 常量和不可变量

\`\`\`solidity
// ✅ constant：编译时替换，0 storage gas
uint256 public constant MAX_SUPPLY = 10000;

// ✅ immutable：部署时写入 bytecode，读取只需 3 gas
address public immutable owner;
constructor() { owner = msg.sender; }
\`\`\`

## Bitmap 替代 bool 数组

\`\`\`solidity
// ❌ bool[] 每个 bool 占 1 slot（20000 gas each）
mapping(uint => bool) public claimed;

// ✅ bitmap：每个 uint256 存 256 个 bool
mapping(uint => uint256) private _claimedBitmap;
function isClaimed(uint tokenId) public view returns (bool) {
  return _claimedBitmap[tokenId / 256] & (1 << (tokenId % 256)) != 0;
}
\`\`\`

## Gas 分析工具
- \`forge snapshot\` — Foundry gas 快照对比
- \`hardhat-gas-reporter\` — Hardhat 测试 gas 报告
- Tenderly Debugger — 逐操作 gas 分析
- ETH Gas Station — 实时 gas price 参考
`,
},

// ============================================================
// 2. 合约升级模式对比
// ============================================================
{
  id: 'ethereum/contract-upgrade-patterns',
  name: '合约升级模式对比：UUPS vs Transparent vs Diamond',
  description: 'Use when user asks about upgradeable smart contracts, proxy patterns, UUPS vs Transparent proxy differences, Diamond pattern, or how to implement contract upgrades safely.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['upgradeable', 'proxy', 'uups', 'transparent', 'diamond', 'eip-2535', 'architecture'],
  content: `# 合约升级模式对比

## 三种主流模式速览

| 模式 | Gas（部署） | Gas（调用） | 升级权限 | 复杂度 | 推荐场景 |
|------|------------|------------|---------|--------|---------|
| **Transparent Proxy** | 高 | 中 | Admin 账户 | 中 | 一般项目 |
| **UUPS** | 低 | 低 | 实现合约 | 低 | **新项目首选** |
| **Diamond (EIP-2535)** | 极高 | 低 | 自定义 | 极高 | 超大型协议 |

---

## 1. Transparent Proxy（最传统）

**原理：** Proxy 合约拦截所有调用，admin 调用走 proxy 管理函数，其他调用 delegatecall 到实现合约。

\`\`\`solidity
// 部署
const proxy = await upgrades.deployProxy(MyContractV1, [initArgs], { kind: 'transparent' })
// 升级
await upgrades.upgradeProxy(proxy.address, MyContractV2)
\`\`\`

**缺点：**
- 每次调用都要检查 msg.sender 是否为 admin（多余 gas）
- admin 和普通用户必须是不同地址（否则 admin 操作无法 delegate）

---

## 2. UUPS（推荐）

**原理：** 升级逻辑放在**实现合约**里，proxy 本身极简（只做 delegatecall）。

\`\`\`solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyContractV1 is UUPSUpgradeable, OwnableUpgradeable {
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() { _disableInitializers(); }
  
  function initialize(address initialOwner) public initializer {
    __Ownable_init(initialOwner);
    __UUPSUpgradeable_init();
  }
  
  // 控制谁能升级
  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
\`\`\`

\`\`\`bash
# 部署
const proxy = await upgrades.deployProxy(MyContractV1, [owner], { kind: 'uups' })
# 升级
await upgrades.upgradeProxy(proxy.address, MyContractV2)
\`\`\`

**优点：**
- Proxy 合约更小（部署 gas 低）
- 调用路径更短（gas 低）
- 升级权限更灵活

**风险：** 实现合约必须包含 \`_authorizeUpgrade\`，否则升级永久锁死。

---

## 3. Diamond Pattern（EIP-2535）

**原理：** 一个 proxy + 多个 facet（功能模块），每个 selector 路由到不同 facet。突破 24KB 合约大小限制。

\`\`\`solidity
// Diamond 结构
Diamond (proxy)
  └── DiamondCut Facet    // 管理 facet 的增删改
  └── DiamondLoupe Facet  // 查询当前 facet 信息
  └── Ownership Facet     // 权限管理
  └── YourFeature Facet   // 业务功能
  └── ...
\`\`\`

**适用场景：**
- 合约逻辑超过 24KB 限制
- 需要细粒度的功能升级（只升级某个模块）
- 长期大型协议（Aavegotchi 等）

**不推荐用于：** 普通项目，复杂度代价远超收益。

---

## Storage 布局安全

**必须遵守的规则：**
\`\`\`solidity
// V1
contract MyContractV1 {
  uint256 public value;    // slot 0
  address public owner;   // slot 1
}

// ✅ V2 只能在后面追加
contract MyContractV2 is MyContractV1 {
  uint256 public newValue; // slot 2（安全）
}

// ❌ 绝对不能在中间插入
contract MyContractV2BAD {
  uint256 public newValue; // slot 0（会覆盖 value！）
  uint256 public value;   // slot 1（会覆盖 owner！）
}
\`\`\`

**验证工具：**
\`\`\`bash
npx hardhat check --network mainnet  # hardhat-upgrades 自动检查 storage 兼容性
\`\`\`

## 升级最佳实践
1. 升级前在 fork 测试网完整测试
2. 用 multisig（Gnosis Safe）管理升级权限，不用 EOA
3. 设置 timelock（24-48h 延迟），给社区反应时间
4. 每次升级后立即验证新实现合约
`,
},

// ============================================================
// 3. MEV 保护
// ============================================================
{
  id: 'ethereum/mev-protection',
  name: 'MEV 保护与 Flashbots 指南',
  description: 'Use when user asks about MEV, front-running protection, Flashbots, private RPC, sandwich attack prevention, or how to protect DeFi protocols from arbitrage bots.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['mev', 'flashbots', 'front-running', 'sandwich', 'private-rpc', 'defi', 'security'],
  content: `# MEV 保护与 Flashbots 指南

## MEV 类型速查

| 类型 | 原理 | 受害者 | 规模 |
|------|------|--------|------|
| **Sandwich Attack** | 目标 swap 前后各插一笔，吃价差 | DEX 用户 | 最常见 |
| **Frontrunning** | 复制目标交易，付更高 gas 抢先 | NFT mint、套利者 |  |
| **Backrunning** | 在目标交易后跑，吃价格影响 | 无直接受害者（套利） |  |
| **Liquidation MEV** | 抢先触发清算获得奖励 | 被清算者 |  |

## 用户侧保护

### 1. 使用私有 RPC（最简单）

\`\`\`
# Flashbots Protect RPC（主网，免费）
https://rpc.flashbots.net

# MEV Blocker（聚合保护）
https://rpc.mevblocker.io

# Metamask 设置：Settings → Networks → Ethereum Mainnet → RPC URL 替换
\`\`\`

私有 RPC 把交易直接发给 validator，绕过公开内存池，无法被 bot 监听。

### 2. 设置合理 Slippage

\`\`\`
- 主流代币（ETH/USDC）：0.1% - 0.5%
- 中等流动性：0.5% - 1%
- 不要超过 1%（除非流动性极差）
- 不要用"自动"（Uniswap 默认 0.5%，但市场波动时会被调高）
\`\`\`

## 合约侧保护

### 1. Commit-Reveal（防止 NFT mint 抢跑）

\`\`\`solidity
// Phase 1: 提交 hash（不暴露内容）
mapping(address => bytes32) public commits;
function commit(bytes32 hash) external {
  commits[msg.sender] = hash;
}

// Phase 2: 揭示（验证 hash 一致）
function reveal(uint256 choice, bytes32 salt) external {
  require(commits[msg.sender] == keccak256(abi.encode(choice, salt, msg.sender)));
  // 执行操作
}
\`\`\`

### 2. 最小化 Slippage 窗口（AMM 集成）

\`\`\`solidity
// ❌ 无保护：允许任意价格滑点
router.exactInputSingle({..., amountOutMinimum: 0});

// ✅ 链上 TWAP 验证（防大幅偏离）
uint256 twapPrice = getTWAP(pool, 30 minutes);
uint256 minOut = twapPrice * amountIn * 99 / 100;  // 允许 1% 偏差
router.exactInputSingle({..., amountOutMinimum: minOut});
\`\`\`

### 3. 使用 Flashbots Bundles（合约交互）

\`\`\`typescript
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle"

const flashbotsProvider = await FlashbotsBundleProvider.create(
  provider,
  authSigner,  // 随机 signer，用于身份验证
  'https://relay.flashbots.net'
)

const bundle = [
  { transaction: tx1, signer: wallet },
  { transaction: tx2, signer: wallet },
]

const targetBlock = await provider.getBlockNumber() + 1
const response = await flashbotsProvider.sendBundle(bundle, targetBlock)
\`\`\`

Bundle 特性：
- 原子性：全部成功或全部失败
- 不进入公开内存池
- 只有成功才付 gas

### 4. 价格保护（协议层）

\`\`\`solidity
// 限制单笔交易影响
uint256 constant MAX_PRICE_IMPACT = 500; // 5%

function swap(uint amountIn) external {
  uint priceBefore = getPrice();
  _executeSwap(amountIn);
  uint priceAfter = getPrice();
  
  uint impact = (priceBefore - priceAfter) * 10000 / priceBefore;
  require(impact <= MAX_PRICE_IMPACT, "Price impact too high");
}
\`\`\`

## MEV 监控工具
- **EigenPhi** (eigenphi.io) — MEV 可视化分析
- **Flashbots Explorer** (explorer.flashbots.net) — Bundle 历史
- **mev-inspect-py** — 自托管 MEV 分析
- **libmev** — 实时 MEV 数据 API
`,
},

// ============================================================
// 4. Layer 2 对比
// ============================================================
{
  id: 'ethereum/l2-comparison',
  name: 'Layer 2 技术对比：Arbitrum vs Optimism vs Base vs zkSync',
  description: 'Use when user asks which Layer 2 to build on, differences between rollup technologies, Arbitrum vs Optimism vs Base vs zkSync, or L2 selection criteria for a new project.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['layer2', 'rollup', 'arbitrum', 'optimism', 'base', 'zksync', 'comparison', 'scaling'],
  content: `# Layer 2 技术对比

## 一句话定位

| L2 | 定位 | 技术 | 生态 |
|----|------|------|------|
| **Arbitrum One** | 最大 TVL，DeFi 主场 | Optimistic Rollup（Nitro） | 成熟，协议最多 |
| **Optimism** | OP Stack 标准，RPGF 激励 | Optimistic Rollup | 公共品生态 |
| **Base** | Coinbase 背书，消费者应用 | OP Stack（Optimism fork） | 增速最快 |
| **zkSync Era** | ZK 技术领先，原生 AA | ZK Rollup（zkEVM） | ZK 生态前沿 |
| **Linea** | ConsenSys 出品，zkEVM | ZK Rollup | 企业背书 |
| **Scroll** | 最接近 EVM 的 zkEVM | ZK Rollup | 研究导向 |
| **Polygon zkEVM** | Polygon 生态 ZK 方向 | ZK Rollup | Polygon 生态 |

---

## 技术维度对比

### Optimistic vs ZK Rollup

| 维度 | Optimistic | ZK Rollup |
|------|-----------|-----------|
| **提款到 L1 时间** | 7 天（挑战期） | 分钟级（证明生成后即可） |
| **Gas 成本** | 较低 | 略高（证明生成成本） |
| **EVM 兼容性** | 完全兼容 | 接近完全（仍有小差异） |
| **技术成熟度** | 成熟 | 快速发展中 |
| **适合场景** | DeFi、通用 dApp | 高频交易、隐私、AA |

### 关键指标对比（2024 Q4）

| L2 | TVL | 日交易量 | Gas（ETH 转账） |
|----|-----|---------|---------------|
| Arbitrum | ~$15B | ~1M | ~$0.01 |
| Base | ~$10B | ~2M | ~$0.01 |
| Optimism | ~$7B | ~500K | ~$0.01 |
| zkSync Era | ~$3B | ~400K | ~$0.02 |

---

## 选链决策树

\`\`\`
你的项目是什么类型？
│
├─ DeFi 协议（需要最大流动性）
│   → Arbitrum One（TVL 最高，DeFi 集成最多）
│
├─ 消费者应用（社交/游戏/NFT）
│   → Base（Coinbase 用户基础，Onchain Summer 生态）
│
├─ 需要 ZK 特性（隐私/AA/高频交易）
│   → zkSync Era（原生 AA，ZK 生态最成熟）
│
├─ 公共品/开源项目（需要 grant）
│   → Optimism（RPGF 激励公共品贡献者）
│
└─ 多链部署（想覆盖更多用户）
    → Arbitrum + Base + Optimism（OP Stack 同构，代码复用率高）
\`\`\`

---

## OP Stack 生态（重要）

Optimism、Base、Zora、Mode、Redstone 等都基于 OP Stack，构成 **Superchain**：
- **代码可复用：** 在 Optimism 部署的合约几乎零成本迁移到 Base
- **统一桥接：** Superchain 内链间通信标准化（正在建设中）
- **共享排序器：** 未来计划

\`\`\`bash
# OP Stack 链合约部署 — 同一套代码
forge script Deploy.s.sol --rpc-url $OP_RPC --broadcast   # Optimism
forge script Deploy.s.sol --rpc-url $BASE_RPC --broadcast  # Base（几乎相同）
\`\`\`

---

## Arbitrum Stylus（新特性）

Arbitrum 支持用 Rust/C++ 写合约（编译为 WASM），gas 比 Solidity 低 10x：
\`\`\`rust
// Rust 写 Arbitrum 合约
#[entrypoint]
fn user_main(input: Vec<u8>) -> Result<Vec<u8>, Vec<u8>> {
    // 处理逻辑
}
\`\`\`

---

## 跨 L2 桥接工具

| 工具 | 支持链 | 特点 |
|------|--------|------|
| **Across** | 主流 L2 | 最快（分钟级），费用低 |
| **Stargate** | 多链 | LayerZero 技术，流动性深 |
| **官方桥** | 各链原生 | 最安全，但慢（7天/分钟级） |
| **Hop Protocol** | OP 系 | 专注 OP Stack 链间 |
`,
},

// ============================================================
// 5. 钱包连接 UX 最佳实践
// ============================================================
{
  id: 'ethereum/wallet-connect-ux',
  name: '钱包连接 UX 最佳实践：RainbowKit vs ConnectKit vs AppKit',
  description: 'Use when user asks about wallet connection UI, RainbowKit vs ConnectKit vs Web3Modal comparison, how to implement wallet connect in React, or Web3 onboarding UX patterns.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['wallet', 'rainbowkit', 'connectkit', 'web3modal', 'ux', 'react', 'wagmi', 'onboarding'],
  content: `# 钱包连接 UX 最佳实践

## 三大库对比

| 库 | 维护方 | 基于 | UI 风格 | 定制度 | 推荐场景 |
|----|--------|------|---------|--------|---------|
| **RainbowKit** | Rainbow | wagmi | 精美，彩虹风格 | 中 | 通用 dApp，快速上线 |
| **ConnectKit** | Family | wagmi | 简洁现代 | 高 | 注重品牌一致性 |
| **AppKit (Web3Modal v3)** | WalletConnect | wagmi/ethers | 通用 | 中 | 多链多生态 |
| **wagmi 原生** | wagmi | — | 无 UI | 完全自定义 | 需要完全自定义 |

---

## RainbowKit（最省事）

\`\`\`bash
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
\`\`\`

\`\`\`tsx
// App.tsx
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { mainnet, polygon, base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = getDefaultConfig({
  appName: 'My App',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',  // cloud.walletconnect.com 申请
  chains: [mainnet, base, polygon],
})

export function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={new QueryClient()}>
        <RainbowKitProvider>
          <YourApp />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// 使用
import { ConnectButton } from '@rainbow-me/rainbowkit'
<ConnectButton />  // 一行搞定
\`\`\`

**自定义 ConnectButton：**
\`\`\`tsx
<ConnectButton.Custom>
  {({ account, chain, openConnectModal, openChainModal, mounted }) => (
    <button onClick={openConnectModal}>
      {account ? account.displayName : 'Connect'}
    </button>
  )}
</ConnectButton.Custom>
\`\`\`

---

## ConnectKit（更高定制）

\`\`\`bash
npm install connectkit wagmi viem @tanstack/react-query
\`\`\`

\`\`\`tsx
import { ConnectKitProvider, ConnectKitButton, getDefaultConfig } from 'connectkit'

const config = createConfig(getDefaultConfig({
  walletConnectProjectId: 'YOUR_PROJECT_ID',
  appName: 'My App',
  chains: [mainnet, base],
}))

// 主题支持：auto | light | dark | web95 | retro | soft | midnight | minimal | rounded | nouns
<ConnectKitProvider theme="auto" customTheme={{ "--ck-font-family": "Inter" }}>
  <ConnectKitButton />
</ConnectKitProvider>
\`\`\`

---

## UX 最佳实践

### 1. 显示正确的链状态
\`\`\`tsx
const { chain } = useAccount()
const { chains, switchChain } = useSwitchChain()

// 检测错误链并提示切换
if (chain?.id !== expectedChainId) {
  return <button onClick={() => switchChain({ chainId: expectedChainId })}>
    Switch to {expectedChain.name}
  </button>
}
\`\`\`

### 2. ENS 名称 + 头像显示
\`\`\`tsx
const { data: ensName } = useEnsName({ address, chainId: mainnet.id })
const { data: avatar } = useEnsAvatar({ name: ensName!, chainId: mainnet.id })

// 显示：vitalik.eth 而不是 0xd8dA...
const displayName = ensName ?? truncateAddress(address)  // "0xd8dA...6045"
\`\`\`

### 3. 交易状态反馈
\`\`\`tsx
const { writeContract, data: hash, isPending } = useWriteContract()
const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

// 三阶段提示
if (isPending) return <span>等待钱包确认...</span>
if (isConfirming) return <span>交易确认中（0/{targetConfirmations}）</span>
if (isSuccess) return <span>✅ 交易成功！</span>
\`\`\`

### 4. Gas 估算
\`\`\`tsx
import { useEstimateGas } from 'wagmi'
const { data: gasEstimate } = useEstimateGas({ to, data, value })
// 展示预估 gas 费用
\`\`\`

### 5. 移动端适配
- RainbowKit 默认支持 WalletConnect QR + 移动端 deep link
- 检测移动端时优先展示 MetaMask Mobile / Trust Wallet
- iOS Safari 注意：需要用户手势触发钱包操作（不能自动弹出）

## 常见坑
- \`projectId\` 必须从 cloud.walletconnect.com 申请，不能用示例 ID
- ENS 查询只在 Ethereum Mainnet（chainId=1），其他链返回 null
- 不要在 SSR 中直接使用 wagmi hooks，需要包在 client component 里
- 切链失败（用户拒绝）要有友好提示，不要 crash
`,
},

]

async function main() {
  console.log(`Writing ${SKILLS.length} P0 gap skills...`)
  let written = 0
  for (const s of SKILLS) {
    const ok = await upsert(s)
    console.log((ok ? '✓' : '✗') + ' ' + s.id)
    if (ok) written++
    await sleep(100)
  }
  console.log(`\nDone: ${written}/${SKILLS.length}`)

  const fin = await fetch(BASE + '/rest/v1/skills?select=type&limit=1000', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  const all = await fin.json()
  const c = {}
  for (const s of all) c[s.type] = (c[s.type]||0)+1
  console.log('\nDB total:', all.length)
  for (const [t,n] of Object.entries(c).sort((a,b)=>b[1]-a[1])) console.log(' ', t+':', n)
}

main().catch(console.error)
