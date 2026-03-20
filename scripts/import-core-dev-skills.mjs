#!/usr/bin/env node
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function upsert(s) {
  const r = await fetch(BASE+'/rest/v1/skills',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({...s,version:'1.0.0',time_sensitivity:'stable',updated_at:new Date().toISOString()})})
  if(!r.ok) console.error('ERR',s.id,await r.text())
  return r.ok
}

const SKILLS = [

// ============================================================
// 1. dev-tooling 决策型（最高频问题）
// ============================================================
{
  id: 'dev-tooling/hardhat-vs-foundry',
  name: 'Hardhat vs Foundry 选型指南',
  description: 'Use when user asks about choosing between Hardhat and Foundry, when to use Hardhat vs Foundry, or differences between EVM development frameworks.',
  ecosystem: 'ethereum', type: 'dev-tooling', source: 'community', confidence: 'high',
  tags: ['hardhat', 'foundry', 'forge', 'testing', 'dev-tools', 'evm'],
  content: `# Hardhat vs Foundry 选型指南

## 核心差异一览

| 维度 | Hardhat | Foundry |
|------|---------|---------|
| **语言** | JavaScript/TypeScript | Rust + Solidity 测试 |
| **测试方式** | JS 写测试（ethers/viem）| Solidity 写测试（forge-std）|
| **速度** | 较慢（JS 运行时）| 极快（Rust 编译，并发执行）|
| **Fuzz 测试** | 需要插件 | 内置，一行开启 |
| **调试** | console.log，可 fork 主网 | forge debug，trace 级别 |
| **插件生态** | 成熟（hardhat-deploy/upgrades）| 成长中 |
| **学习曲线** | 低（会 JS 即可）| 中（需了解 Solidity 测试）|
| **脚本部署** | JS/TS 脚本 | Solidity Script（\\`forge script\\`）|
| **社区** | 更大，文档更全 | 快速增长，Paradigm 主导 |

---

## 选 Foundry 的场景

\`\`\`bash
# 快速安装
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 新建项目
forge init my-project
cd my-project

# 测试（比 Hardhat 快 10-100x）
forge test
forge test -vvv          # 详细 trace
forge test --match-test testFuzz  # 只跑某个测试

# Fuzz 测试（内置）
# 在测试函数接受参数即自动 fuzz
function testFuzz_transfer(uint256 amount) public { ... }

# Fork 主网
forge test --fork-url https://eth-mainnet.alchemyapi.io/v2/KEY

# Gas 报告
forge test --gas-report
\`\`\`

**选 Foundry 如果：**
- 写纯合约项目（无复杂前端集成）
- 需要大量 fuzz/invariant 测试
- 在乎测试速度（CI 时间）
- 团队熟悉 Solidity

---

## 选 Hardhat 的场景

\`\`\`bash
# 安装
npm install --save-dev hardhat
npx hardhat init

# 测试
npx hardhat test
npx hardhat test --network localhost

# hardhat-deploy（推荐插件）
npm install --save-dev hardhat-deploy
# 支持 named accounts, deployments 目录, tags

# 升级合约（hardhat-upgrades）
npm install @openzeppelin/hardhat-upgrades
\`\`\`

**选 Hardhat 如果：**
- 全栈项目，前端需要 artifacts/typechain
- 使用 hardhat-deploy 做复杂部署流程
- 需要 OpenZeppelin Upgrades 插件
- 团队 JS/TS 背景

---

## 混合使用（最佳实践）

很多成熟项目同时用两者：
- **Foundry** 做单元测试 + fuzz（速度快）
- **Hardhat** 做集成测试 + 部署脚本（生态丰富）

\`\`\`
my-project/
├── foundry.toml      # Foundry 配置
├── hardhat.config.ts # Hardhat 配置
├── src/              # 合约（共用）
├── test/             # Foundry 测试（.t.sol）
└── scripts/          # Hardhat 部署脚本（.ts）
\`\`\`

---

## 关键命令速查

\`\`\`bash
# Foundry
forge build              # 编译
forge test               # 测试
forge script Deploy.s.sol --rpc-url $RPC --broadcast  # 部署
cast call $ADDR "balanceOf(address)(uint256)" $USER    # 读链上
cast send $ADDR "transfer(address,uint256)" $TO $AMT --private-key $KEY  # 写链上

# Hardhat
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network mainnet
npx hardhat verify --network mainnet $ADDR
\`\`\`
`},

{
  id: 'dev-tooling/ethers-vs-viem',
  name: 'ethers.js vs viem vs wagmi 选型指南',
  description: 'Use when user asks about choosing between ethers.js, viem, and wagmi for Ethereum frontend development, or differences between Web3 JavaScript libraries.',
  ecosystem: 'ethereum', type: 'dev-tooling', source: 'community', confidence: 'high',
  tags: ['ethers', 'viem', 'wagmi', 'web3js', 'frontend', 'typescript', 'react'],
  content: `# ethers.js vs viem vs wagmi 选型指南

## 定位区别

| 库 | 定位 | 适用场景 |
|----|------|---------|
| **ethers.js v6** | 全功能 EVM 库，历史最悠久 | 后端脚本、Node.js 工具 |
| **viem** | 轻量、类型安全、高性能 | 现代前端/后端，替代 ethers |
| **wagmi** | React Hooks 封装（基于 viem）| React DApp 前端 |
| **web3.js** | 最老的库，逐渐被淘汰 | 维护旧项目，不推荐新项目 |

---

## viem 为什么正在替代 ethers

\`\`\`typescript
// ethers v6
const provider = new ethers.JsonRpcProvider(RPC_URL)
const balance = await provider.getBalance(address)
// balance 是 BigInt

// viem（同样功能，更轻量 + 更好的类型推断）
import { createPublicClient, http, formatEther } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({ chain: mainnet, transport: http(RPC_URL) })
const balance = await client.getBalance({ address })
\`\`\`

**viem 优势：**
- **Bundle size**：viem ~35KB vs ethers ~280KB（gzip 后）
- **Tree-shaking**：按需引入，unused code 不打包
- **类型安全**：ABI 类型自动推导，IDE 补全更准
- **性能**：同等请求下速度更快

---

## 实际代码对比

### 读合约

\`\`\`typescript
// ethers v6
const contract = new ethers.Contract(address, ABI, provider)
const name = await contract.name()

// viem
const name = await client.readContract({
  address, abi: ABI, functionName: 'name'
})
\`\`\`

### 写合约（发交易）

\`\`\`typescript
// ethers v6
const signer = await provider.getSigner()
const contract = new ethers.Contract(address, ABI, signer)
const tx = await contract.transfer(to, amount)
await tx.wait()

// viem（分 publicClient + walletClient）
import { createWalletClient, custom } from 'viem'
const walletClient = createWalletClient({ chain: mainnet, transport: custom(window.ethereum) })

const hash = await walletClient.writeContract({
  address, abi: ABI, functionName: 'transfer', args: [to, amount]
})
await client.waitForTransactionReceipt({ hash })
\`\`\`

---

## wagmi（React DApp 首选）

\`\`\`bash
npm install wagmi viem @tanstack/react-query
\`\`\`

\`\`\`tsx
// _app.tsx
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, base, arbitrum } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const config = createConfig({
  chains: [mainnet, base, arbitrum],
  connectors: [injected(), walletConnect({ projectId: 'YOUR_ID' })],
  transports: { [mainnet.id]: http(), [base.id]: http(), [arbitrum.id]: http() },
})

// 使用 Hooks
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi'

function MyDApp() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  
  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESS, abi: ERC20_ABI,
    functionName: 'balanceOf', args: [address!],
    query: { enabled: !!address }
  })
  
  const { writeContract, isPending } = useWriteContract()
  
  const handleTransfer = () => {
    writeContract({
      address: TOKEN_ADDRESS, abi: ERC20_ABI,
      functionName: 'transfer', args: [recipient, amount]
    })
  }
  
  return <button onClick={handleTransfer} disabled={isPending}>Transfer</button>
}
\`\`\`

---

## 决策树

\`\`\`
你的项目是什么？
│
├─ React DApp 前端
│   → wagmi（Hooks 封装，开箱即用）
│
├─ Next.js / 纯前端，不想用 React Hooks
│   → viem（轻量，直接调用）
│
├─ Node.js 后端脚本 / CLI 工具
│   → viem（或 ethers v6，都可以）
│
├─ 维护旧项目（ethers v5）
│   → 继续用 ethers v5，不急迁移
│
└─ 维护旧项目（web3.js）
    → 评估迁移成本，新功能用 viem
\`\`\`

## npm 下载量趋势（2024）
- wagmi: ~700K/week（快速增长）
- ethers: ~2.5M/week（仍是最多，但增速放缓）
- viem: ~2M/week（增速最快）
- web3.js: ~500K/week（下降中）
`},

// ============================================================
// 2. Solana 程序开发基础
// ============================================================
{
  id: 'solana/program-model',
  name: 'Solana 程序开发基础：Account Model & Program',
  description: 'Use when user asks about Solana program development basics, Solana account model, how Solana differs from EVM, rent, PDAs, or getting started with Solana smart contract development.',
  ecosystem: 'solana', type: 'guide', source: 'community', confidence: 'high',
  tags: ['solana', 'program', 'account-model', 'pda', 'rent', 'spl', 'anchor', 'beginner'],
  content: `# Solana 程序开发基础

## Solana vs EVM 核心差异

| 概念 | EVM（以太坊）| Solana |
|------|------------|--------|
| **智能合约** | Contract（代码+状态合一）| Program（只有代码）+ Account（只有状态）|
| **状态存储** | 合约内部 storage | 独立 Account（租金制）|
| **并发** | 顺序执行 | 并行（AccountSet 不重叠即可并行）|
| **账户类型** | EOA + Contract | 统一 Account（区分 executable）|
| **费用** | gas | transaction fee + rent |
| **原生代币** | ETH | SOL |
| **代币标准** | ERC-20 | SPL Token（单一标准）|

---

## Account 模型（核心概念）

\`\`\`
Solana 上万物皆 Account：

普通账户（用户钱包）
  ├── lamports: u64    ← SOL 余额（1 SOL = 1e9 lamports）
  ├── data: []         ← 通常为空
  ├── owner: System Program
  └── executable: false

Program Account（部署的程序）
  ├── lamports: u64
  ├── data: [bytecode]  ← ELF 格式的 BPF 字节码
  ├── owner: BPF Loader
  └── executable: true

Data Account（程序状态）
  ├── lamports: u64    ← 必须 >= rent_exempt 金额
  ├── data: [custom]   ← 由程序定义的序列化数据
  ├── owner: 你的 Program ← 只有 owner 程序可以修改 data
  └── executable: false
\`\`\`

### Rent（账户租金）

\`\`\`bash
# 账户必须保持 rent-exempt（存足够的 SOL）
# 否则会被垃圾回收（账户数据丢失）

# 计算 rent-exempt 金额
solana rent 128   # 128 bytes 的账户需要多少 SOL

# 典型值：
# 128 bytes ≈ 0.00203928 SOL
# 1KB ≈ 0.00714 SOL
# 10KB ≈ 0.0703 SOL
\`\`\`

---

## PDA（Program Derived Address）

PDA 是由程序控制的账户地址，没有私钥，只有程序能签名。

\`\`\`rust
// 在 Anchor 程序中使用 PDA
#[account(
  init,
  payer = user,
  space = 8 + 32 + 8,  // discriminator + pubkey + u64
  seeds = [b"vault", user.key().as_ref()],
  bump
)]
pub vault: Account<'info, Vault>,

// 派生 PDA（链下计算）
use solana_sdk::pubkey::Pubkey;
let (pda, bump) = Pubkey::find_program_address(
  &[b"vault", user_pubkey.as_ref()],
  &program_id,
);
\`\`\`

**PDA 常见用途：**
- Token vault（代币托管账户）
- 用户状态存储（每个用户独立一个 PDA）
- 跨程序调用时的签名者（CPI with seeds）

---

## Anchor 框架快速上手

\`\`\`bash
# 安装
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest && avm use latest

# 新建项目
anchor init my-program
cd my-program

# 目录结构
# programs/my-program/src/lib.rs  ← 程序代码
# tests/my-program.ts             ← TypeScript 测试
# Anchor.toml                     ← 配置

# 编译 + 测试（本地验证节点）
anchor test
\`\`\`

### 最小 Anchor 程序

\`\`\`rust
use anchor_lang::prelude::*;

declare_id!("YourProgramPubkeyHere");

#[program]
pub mod counter {
  use super::*;

  pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    ctx.accounts.counter.count = 0;
    Ok(())
  }

  pub fn increment(ctx: Context<Increment>) -> Result<()> {
    ctx.accounts.counter.count += 1;
    Ok(())
  }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
  #[account(init, payer = user, space = 8 + 8)]
  pub counter: Account<'info, Counter>,
  #[account(mut)]
  pub user: Signer<'info>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
  #[account(mut)]
  pub counter: Account<'info, Counter>,
}

#[account]
pub struct Counter {
  pub count: u64,
}
\`\`\`

---

## SPL Token（Solana 代币标准）

\`\`\`
Mint Account（代币定义）
  ├── mint_authority
  ├── supply: u64
  └── decimals: u8

Token Account（持仓）← 每个用户+每种代币 = 独立账户
  ├── mint: Pubkey     ← 指向哪种代币
  ├── owner: Pubkey    ← 谁拥有这个账户
  └── amount: u64

Associated Token Account (ATA)
  ← 用确定性方式派生出用户的 Token Account 地址
  ← 简化: getOrCreateAssociatedTokenAccount()
\`\`\`

\`\`\`typescript
// @solana/spl-token
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token"

const ata = await getOrCreateAssociatedTokenAccount(
  connection, payer, mintAddress, ownerAddress
)
await transfer(connection, payer, senderATA.address, recipientATA.address, owner, 1000n)
\`\`\`

---

## 常见错误速查

| 错误 | 原因 | 解决 |
|------|------|------|
| \`AccountNotFound\` | 账户未初始化 | 先 init 账户 |
| \`InsufficientFunds\` | lamports 不足 | 确保 rent-exempt |
| \`ConstraintMut\` | 账户未标记 \\`#[account(mut)]\\` | 加 mut 约束 |
| \`InvalidAccountOwner\` | 账户 owner 不是该程序 | 检查账户归属 |
| \`AccountAlreadyInitialized\` | 重复 init | 改用 \\`init_if_needed\\` |
| \`ProgramFailedToComplete\` | 超出 compute units | 加 \\`#[instruction(...)]\\` 提高 CU |
`},

// ============================================================
// 3. L2 开发指南（Arbitrum + zkSync）
// ============================================================
{
  id: 'ethereum/l2-dev-guide',
  name: 'L2 开发指南：Arbitrum / Optimism / zkSync / Base',
  description: 'Use when user asks about developing on L2 networks, differences between L2s for developers, deploying contracts to Arbitrum, zkSync, Optimism or Base, or L2-specific gotchas.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['l2', 'arbitrum', 'optimism', 'zksync', 'base', 'rollup', 'op-stack', 'scaling'],
  content: `# L2 开发指南：Arbitrum / Optimism / zkSync / Base

## L2 类型与技术路线

\`\`\`
Optimistic Rollups（乐观，7天提款期）
  ├── Arbitrum One（Nitro，EVM+ 等价）
  ├── Optimism（OP Stack，EVM 等价）
  └── Base（Coinbase 出品，OP Stack）

ZK Rollups（零知识，快速提款）
  ├── zkSync Era（zkEVM，部分 EVM 兼容）
  ├── Starknet（Cairo VM，非 EVM）
  ├── Polygon zkEVM（EVM 等价）
  └── Scroll（EVM 等价）
\`\`\`

---

## 各 L2 开发差异

### Arbitrum One（最兼容 EVM）

\`\`\`typescript
// 几乎与以太坊主网完全相同
// 主要差异：

// 1. block.number 返回 L1 区块号（近似）
// 用 ArbSys 获取 L2 区块号
const arbSys = new ethers.Contract(
  "0x0000000000000000000000000000000000000064",
  ["function arbBlockNumber() view returns (uint256)"],
  provider
)
const l2Block = await arbSys.arbBlockNumber()

// 2. Gas 计算（L1 calldata 费 + L2 执行费）
// 无需手动处理，SDK 自动估算

// 3. 预编译合约（Arbitrum 专有）
// ArbGasInfo: 0x000...6c
// ArbSys: 0x000...64
// ArbRetryableTx: 0x000...6e（L1→L2 消息重试）
\`\`\`

**部署到 Arbitrum：**
\`\`\`bash
# Hardhat：只需改 network 配置
networks: {
  arbitrum: {
    url: "https://arb1.arbitrum.io/rpc",
    accounts: [PRIVATE_KEY],
    chainId: 42161
  }
}
npx hardhat run scripts/deploy.ts --network arbitrum
\`\`\`

---

### Optimism / Base（OP Stack 系列）

\`\`\`typescript
// OP Stack 差异：
// 1. L1Block 预编译（0x4200...15）— 获取 L1 区块信息
// 2. L2ToL1MessagePasser（跨链消息）
// 3. Superchain 概念：Base/Optimism/Mode 共享序列器（路线图）

// Base 配置（与 Optimism 几乎相同）
networks: {
  base: {
    url: "https://mainnet.base.org",
    chainId: 8453
  },
  "base-sepolia": {
    url: "https://sepolia.base.org",
    chainId: 84532
  }
}

// Base 特有：Coinbase Smart Wallet 集成
// coinbase-sdk: 支持 Passkey 签名，无助记词
\`\`\`

---

### zkSync Era（最大差异）

\`\`\`typescript
// zkSync 与 EVM 关键差异：
// 1. 不支持 tx.origin（安全原因）
// 2. ECDSA 签名验证略有不同
// 3. 自定义 Paymaster（代付 gas）
// 4. 原生账户抽象（所有账户都是合约）
// 5. ecrecover 行为略有差异

import { Provider, Wallet, ContractFactory } from "zksync-ethers"
import { Deployer } from "@matterlabs/hardhat-zksync"

// 必须使用 zksync-ethers，不能直接用 ethers
const provider = new Provider("https://mainnet.era.zksync.io")
const wallet = new Wallet(PRIVATE_KEY, provider)

// 部署（需要 hardhat-zksync 插件）
// npm install @matterlabs/hardhat-zksync @matterlabs/hardhat-zksync-deploy
\`\`\`

\`\`\`typescript
// hardhat.config.ts for zkSync
import "@matterlabs/hardhat-zksync"
networks: {
  zkSyncMainnet: {
    url: "https://mainnet.era.zksync.io",
    ethNetwork: "mainnet",
    zksync: true,   // 必须加这个
    chainId: 324
  }
}
\`\`\`

---

## 跨链 Bridge 开发

### 官方 Bridge（最安全，最慢）

\`\`\`typescript
// Arbitrum SDK：L1 → L2 存款
import { EthBridger, getL2Network } from "@arbitrum/sdk"

const l2Network = await getL2Network(l2Provider)
const ethBridger = new EthBridger(l2Network)

const depositTx = await ethBridger.deposit({
  amount: ethers.parseEther("0.01"),
  l1Signer,
  l2Provider,
})
await depositTx.wait()
// L2 到账需要约 10-15 分钟

// L2 → L1 提款（需等待 7 天挑战期）
const withdrawTx = await ethBridger.withdraw({
  amount: ethers.parseEther("0.01"),
  l2Signer,
  destinationAddress: userAddress,
  from: userAddress,
})
\`\`\`

---

## Gas 优化（L2 特有）

\`\`\`solidity
// L2 上 gas 费极低，但 L1 calldata 费用仍存在
// 减少 calldata 大小 = 降低 L1 data fee

// 坏：传完整 bytes32
function update(bytes32 data) external { ... }

// 好：用更小的类型（如果数据范围允许）
function update(uint128 data) external { ... }

// Arbitrum/Optimism：使用 Blob（EIP-4844）后 L1 data fee 已大幅降低
// 当前（2024）：Arbitrum L1 fee ≈ $0.001，执行费 ≈ $0.0001
\`\`\`

---

## 测试网速查

| L2 | 测试网 | Faucet |
|----|--------|--------|
| Arbitrum | Sepolia (421614) | faucet.triangleplatform.com |
| Optimism | Sepolia (11155420) | app.optimism.io/faucet |
| Base | Sepolia (84532) | faucet.quicknode.com/base/sepolia |
| zkSync | Sepolia (300) | faucet.quicknode.com/zksync/sepolia |
| Polygon zkEVM | Cardona (2442) | faucet.polygon.technology |

## 工具速查
| 工具 | 支持 L2 |
|------|---------|
| Alchemy | Arbitrum/Optimism/Base/Polygon/zkSync |
| Infura | Arbitrum/Optimism/Base/zkSync/Linea |
| Tenderly | 全部主流 L2（最好用的调试工具）|
| Blockscout | 各 L2 均有部署 |
`},

// ============================================================
// 4. NEAR 开发基础
// ============================================================
{
  id: 'near/dev-guide',
  name: 'NEAR Protocol 开发指南',
  description: 'Use when user asks about NEAR development, NEAR smart contracts, Rust or JavaScript contracts on NEAR, NEAR account model, Aurora EVM, or getting started with NEAR blockchain.',
  ecosystem: 'near', type: 'guide', source: 'community', confidence: 'high',
  tags: ['near', 'rust', 'javascript', 'near-sdk', 'aurora', 'account-model', 'storage-staking'],
  content: `# NEAR Protocol 开发指南

## NEAR 核心特点

- **账户可读名称**：账户 ID 是字符串（如 \`alice.near\`），不是十六进制地址
- **子账户系统**：\`app.alice.near\` 是 \`alice.near\` 的子账户
- **Storage Staking**：存储数据需要质押 NEAR（1 NEAR = 10KB）
- **异步跨合约调用**：通过 Promise 机制，非阻塞
- **Aurora**：NEAR 上的 EVM 兼容链，Solidity 直接跑
- **低 gas**：交易费 < $0.001

---

## 账户模型

\`\`\`
NEAR 账户类型：

Named Account（有名字）
  └── alice.near  ←→  bob.near
      ├── alice.app.near（子账户）
      └── alice.testnet（测试网）

Implicit Account（64字符十六进制，与以太坊类似）
  └── 98793cd91a...（由公钥派生）

合约账户：
  └── 合约就是部署了代码的普通账户（无"合约账户"特殊类型）
\`\`\`

---

## Rust 合约开发

\`\`\`bash
# 安装
rustup target add wasm32-unknown-unknown
cargo install cargo-near near-cli-rs

# 创建项目
cargo near new my-contract
cd my-contract
\`\`\`

\`\`\`rust
// src/lib.rs
use near_sdk::{near, store::LookupMap, AccountId, NearToken, PanicOnDefault};

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
  owner: AccountId,
  balances: LookupMap<AccountId, u128>,
}

#[near]
impl Contract {
  #[init]
  pub fn new(owner: AccountId) -> Self {
    Self {
      owner,
      balances: LookupMap::new(b"b"),
    }
  }

  // 修改状态：需要 &mut self
  #[payable]
  pub fn deposit(&mut self) {
    let amount = near_sdk::env::attached_deposit().as_yoctonear();
    let caller = near_sdk::env::predecessor_account_id();
    let balance = self.balances.get(&caller).unwrap_or(&0);
    self.balances.insert(caller, balance + amount);
  }

  // 读取状态：&self
  pub fn get_balance(&self, account_id: AccountId) -> u128 {
    self.balances.get(&account_id).copied().unwrap_or(0)
  }

  // 跨合约调用（异步 Promise）
  pub fn cross_call(&self, contract_id: AccountId) -> near_sdk::Promise {
    near_sdk::ext_contract::ext(contract_id)
      .with_static_gas(near_sdk::Gas::from_tgas(5))
      .some_method()
  }
}
\`\`\`

\`\`\`bash
# 编译
cargo near build

# 部署
near contract deploy my-account.testnet \
  use-file ./target/near/my-contract.wasm \
  without-init-call \
  network-config testnet

# 调用
near contract call-function as-transaction my-account.testnet deposit \
  json-args '{}' prepaid-gas '10 Tgas' attached-deposit '1 NEAR' \
  sign-as my-account.testnet network-config testnet
\`\`\`

---

## JavaScript/TypeScript 合约

\`\`\`bash
npm install near-sdk-js
\`\`\`

\`\`\`typescript
import { NearBindgen, call, view, initialize, near } from "near-sdk-js"

@NearBindgen({})
class Counter {
  count: number = 0

  @initialize({})
  init({ start }: { start: number }) {
    this.count = start
  }

  @call({})
  increment({ by = 1 }: { by?: number }) {
    this.count += by
  }

  @view({})
  get_count(): number {
    return this.count
  }
}
\`\`\`

---

## NEAR JavaScript SDK（前端）

\`\`\`bash
npm install near-api-js
\`\`\`

\`\`\`typescript
import { connect, keyStores, WalletConnection } from "near-api-js"

// 连接
const near = await connect({
  networkId: "mainnet",
  nodeUrl: "https://rpc.mainnet.near.org",
  walletUrl: "https://app.mynearwallet.com",
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
})

// 钱包连接
const wallet = new WalletConnection(near, "my-app")
if (!wallet.isSignedIn()) wallet.requestSignIn({ contractId: "my-contract.near" })

// 读合约（view call，免费）
const account = await near.account("my-contract.near")
const result = await account.viewFunction({
  contractId: "my-contract.near",
  methodName: "get_balance",
  args: { account_id: wallet.getAccountId() }
})

// 写合约（需签名）
const result2 = await wallet.account().functionCall({
  contractId: "my-contract.near",
  methodName: "deposit",
  args: {},
  attachedDeposit: BigInt("1000000000000000000000000"), // 1 NEAR in yocto
  gas: BigInt("30000000000000") // 30 TGas
})
\`\`\`

---

## Storage Staking 注意事项

\`\`\`rust
// NEAR 存储每字节需质押约 0.00001 NEAR
// 1KB 存储 ≈ 0.01 NEAR
// 合约必须保证自身账户有足够 NEAR 覆盖存储

// 最佳实践：让用户支付自己的存储成本
#[payable]
pub fn register_user(&mut self) {
  let storage_cost = 100_000_000_000_000_000_000_000u128; // 0.1 NEAR
  let deposit = near_sdk::env::attached_deposit().as_yoctonear();
  require!(deposit >= storage_cost, "Insufficient deposit for storage");
  // 存储用户数据...
}
\`\`\`

---

## Aurora（NEAR 上的 EVM）

- **完全 EVM 兼容**：Solidity/Hardhat/Foundry 直接用
- **使用 NEAR 作为 gas**（或 ETH）
- **桥**：Rainbow Bridge（NEAR ↔ Ethereum）
- **Chain ID**: 1313161554（mainnet）

\`\`\`bash
# Aurora Mainnet RPC
https://mainnet.aurora.dev

# 直接用 Hardhat 部署
networks: {
  aurora: {
    url: "https://mainnet.aurora.dev",
    chainId: 1313161554,
    accounts: [PRIVATE_KEY]
  }
}
\`\`\`

## 工具速查
| 工具 | 用途 |
|------|------|
| NEAR CLI RS | 官方 CLI（2024 新版）|
| cargo-near | Rust 合约编译/部署 |
| near-api-js | JavaScript SDK |
| NEAR Explorer | explorer.near.org |
| MyNearWallet | 主流钱包 |
| Meteor Wallet | 开发者常用 |
`},

// ============================================================
// 5. OpenZeppelin 进阶模式
// ============================================================
{
  id: 'protocols/openzeppelin-advanced',
  name: 'OpenZeppelin 进阶模式：升级 / 多签 / 治理 / 访问控制',
  description: 'Use when user asks about OpenZeppelin upgradeable contracts, TransparentProxy vs UUPS, governance with Governor, TimelockController, AccessControl roles, or OpenZeppelin advanced patterns.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['openzeppelin', 'upgradeable', 'uups', 'transparent-proxy', 'governor', 'timelock', 'access-control', 'multisig'],
  content: `# OpenZeppelin 进阶模式

## 可升级合约（Proxy 模式）

### Transparent Proxy vs UUPS

| 维度 | Transparent Proxy | UUPS |
|------|------------------|------|
| 升级函数位置 | Proxy 合约 | 实现合约 |
| Admin 地址 | Proxy 存储 | 实现合约管理 |
| Gas（用户调用）| 略高（admin 检查）| 更低 |
| 升级权限检查 | 部署时固定 | 实现合约控制（更灵活）|
| **推荐** | 简单项目 | **新项目首选** |

\`\`\`bash
npm install @openzeppelin/contracts-upgradeable
npm install --save-dev @openzeppelin/hardhat-upgrades
\`\`\`

### UUPS 升级合约

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyContractV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
  uint256 public value;

  // ❌ 不能用 constructor
  // ✅ 用 initialize 代替
  function initialize(address owner) public initializer {
    __Ownable_init(owner);
    __UUPSUpgradeable_init();
    value = 0;
  }

  function setValue(uint256 _value) external {
    value = _value;
  }

  // 必须实现：控制谁可以升级
  function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

  // ⚠️ 升级时新版本要保持 storage layout！
  // ✅ 只能追加 storage，不能改已有变量顺序
  // ✅ 使用 __gap 为未来预留空间
  uint256[49] private __gap;  // 与已用 1 个 slot 合计 50
}
\`\`\`

\`\`\`typescript
// 部署
const MyContract = await ethers.getContractFactory("MyContractV1")
const proxy = await upgrades.deployProxy(MyContract, [ownerAddress], { kind: "uups" })
await proxy.waitForDeployment()

// 升级
const MyContractV2 = await ethers.getContractFactory("MyContractV2")
await upgrades.upgradeProxy(await proxy.getAddress(), MyContractV2)

// 验证 storage 兼容性
await upgrades.validateUpgrade(proxyAddress, MyContractV2)
\`\`\`

---

## AccessControl（角色权限）

\`\`\`solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyProtocol is AccessControl {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  constructor(address admin) {
    _grantRole(DEFAULT_ADMIN_ROLE, admin);  // admin 可以管理所有角色
    _grantRole(MINTER_ROLE, admin);
    _grantRole(PAUSER_ROLE, admin);
  }

  function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
    // 只有 MINTER_ROLE 可以调用
  }

  // 授权（需要 DEFAULT_ADMIN_ROLE）
  // contract.grantRole(MINTER_ROLE, newMinter)
  // contract.revokeRole(MINTER_ROLE, oldMinter)
  // contract.renounceRole(MINTER_ROLE, self)
}
\`\`\`

---

## TimelockController（延时执行）

\`\`\`solidity
import "@openzeppelin/contracts/governance/TimelockController.sol";

// 部署：
// minDelay = 172800 (2 days)
// proposers = [multisig]  ← 谁可以提案
// executors = [address(0)] ← address(0) = 任何人可执行
// admin = address(0)       ← 部署后无 admin（完全去中心化）
TimelockController timelock = new TimelockController(
  172800,      // 2 天延时
  proposers,
  executors,
  address(0)
);

// 将合约所有权转给 Timelock
myContract.transferOwnership(address(timelock));

// 之后所有敏感操作需通过 Timelock
// 1. 提案（schedule）→ 2. 等待 2 天 → 3. 执行（execute）
\`\`\`

---

## Governor（链上治理）

\`\`\`solidity
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract MyGovernor is
  Governor,
  GovernorSettings,
  GovernorCountingSimple,
  GovernorVotes,
  GovernorTimelockControl
{
  constructor(IVotes token, TimelockController timelock)
    Governor("MyGovernor")
    GovernorSettings(
      7200,    // 1 天投票延迟（blocks）
      50400,   // 1 周投票期（blocks）
      0        // 提案门槛（持有多少票才能提案）
    )
    GovernorVotes(token)
    GovernorTimelockControl(timelock)
  {}

  function quorum(uint256) public pure override returns (uint256) {
    return 4e18;  // 4 个投票权即可通过
  }
  // ... 覆盖必要函数
}
\`\`\`

\`\`\`typescript
// 链上治理流程
// 1. 创建提案
const proposalId = await governor.propose(
  [targetContract],          // 要调用的合约
  [0],                       // ETH 金额
  [calldata],                // 编码的函数调用
  "Proposal description"     // 说明
)

// 2. 等待投票期开始 → 投票
await governor.castVote(proposalId, 1)  // 1=赞成, 0=反对, 2=弃权

// 3. 投票结束后队列（进入 Timelock）
await governor.queue([target], [0], [calldata], descriptionHash)

// 4. 等待 Timelock 延时 → 执行
await governor.execute([target], [0], [calldata], descriptionHash)
\`\`\`

---

## 常用 OZ 组件速查

\`\`\`solidity
// ERC-20 全功能代币
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";  // 治理投票权

// ERC-721 NFT
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";

// 安全工具
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";  // 白名单 Merkle 验证
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";        // 签名验证
\`\`\`

## 升级合约安全清单
- ✅ 新版本 storage layout 兼容（只追加，不改顺序）
- ✅ `initialize` 不能被二次调用（\`initializer\` modifier）
- ✅ 实现合约构造函数调用 `_disableInitializers()`
- ✅ 升级权限在 Timelock 之后（不能单人即时升级）
- ✅ 用工具验证：\`upgrades.validateUpgrade()\`
`},

]

async function main() {
  console.log(`Writing ${SKILLS.length} core dev skills...`)
  let ok = 0
  for (const s of SKILLS) {
    const res = await upsert(s)
    console.log((res?'✅':'❌')+' '+s.id)
    if (res) ok++
    await sleep(100)
  }
  // count
  const r = await fetch(BASE+'/rest/v1/skills?select=type&limit=2000',{headers:{apikey:KEY,Authorization:'Bearer '+KEY}})
  const all = await r.json()
  const c={}; for(const s of all) c[s.type]=(c[s.type]||0)+1
  console.log(\`\nDone: ${ok}/${SKILLS.length} | DB total: ${all.length}\`)
  for(const [t,n] of Object.entries(c).sort((a,b)=>b[1]-a[1])) console.log(` ${t}: ${n}`)
}
main().catch(console.error)
