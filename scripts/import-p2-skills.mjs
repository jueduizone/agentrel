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
// 1. Cosmos / IBC
// ============================================================
{
  id: 'cosmos/ibc-integration',
  name: 'Cosmos IBC 跨链通信开发指南',
  description: 'Use when user asks about IBC protocol, Cosmos cross-chain communication, building IBC channels, ICS standards, or developing Cosmos SDK modules with interchain capabilities.',
  ecosystem: 'cosmos', type: 'guide', source: 'community', confidence: 'high',
  tags: ['cosmos', 'ibc', 'interchain', 'cosmos-sdk', 'cross-chain', 'ics'],
  content: `# Cosmos IBC 跨链通信开发指南

## IBC 核心概念

\`\`\`
Chain A                    Relayer                    Chain B
  │                           │                           │
  ├─ create channel ─────────►│──────────────────────────►│
  ├─ send IBC packet ────────►│──────────────────────────►│
  │                           │◄── recv packet + ACK ─────┤
  └─ confirm ACK ◄────────────│                           │
\`\`\`

| 概念 | 说明 |
|------|------|
| **Light Client** | 在一条链上验证另一条链的状态（核心安全机制）|
| **Connection** | 两条链之间的可信连接（基于 light client）|
| **Channel** | 在 connection 上建立的有序/无序消息通道 |
| **Packet** | IBC 消息单元（含数据 + 超时时间）|
| **Relayer** | 中继器，负责将 packet 从一条链提交到另一条 |

---

## Cosmos SDK 模块开发

\`\`\`
mychain/
├── x/mymodule/
│   ├── keeper/
│   │   ├── keeper.go        # 状态读写
│   │   ├── msg_server.go    # 消息处理
│   │   └── ibc.go           # IBC 回调
│   ├── types/
│   │   ├── msgs.go          # 消息类型
│   │   ├── keys.go          # Store key 定义
│   │   └── codec.go         # 编解码
│   ├── module.go            # 模块注册
│   └── ibc_module.go        # IBC 接口实现
\`\`\`

### IBC 模块接口（必须实现）

\`\`\`go
// ibc_module.go
type IBCModule struct {
  keeper keeper.Keeper
}

// 通道握手
func (im IBCModule) OnChanOpenInit(...) (string, error) { return version, nil }
func (im IBCModule) OnChanOpenTry(...) (string, error)  { return version, nil }
func (im IBCModule) OnChanOpenAck(...)  error            { return nil }
func (im IBCModule) OnChanOpenConfirm(...) error         { return nil }
func (im IBCModule) OnChanCloseInit(...) error           { return nil }
func (im IBCModule) OnChanCloseConfirm(...) error        { return nil }

// 数据包处理
func (im IBCModule) OnRecvPacket(ctx sdk.Context, packet channeltypes.Packet, relayer sdk.AccAddress) ibcexported.Acknowledgement {
  var data MyPacketData
  if err := types.ModuleCdc.UnmarshalJSON(packet.GetData(), &data); err != nil {
    return channeltypes.NewErrorAcknowledgement(err)
  }
  // 处理业务逻辑
  if err := im.keeper.ProcessPacket(ctx, data); err != nil {
    return channeltypes.NewErrorAcknowledgement(err)
  }
  return channeltypes.NewResultAcknowledgement([]byte{1})
}

func (im IBCModule) OnAcknowledgementPacket(...) error { return nil }
func (im IBCModule) OnTimeoutPacket(...) error          { return nil }
\`\`\`

---

## 发送 IBC 数据包

\`\`\`go
func (k Keeper) SendIBCPacket(ctx sdk.Context, channelID string, data MyData) error {
  // 序列化数据
  packetData, err := types.ModuleCdc.MarshalJSON(&data)
  if err != nil { return err }

  // 设置超时（建议 10 分钟以上）
  timeout := uint64(ctx.BlockTime().Add(10 * time.Minute).UnixNano())

  // 发送
  _, err = k.channelKeeper.SendPacket(
    ctx,
    k.scopedKeeper,
    "transfer",   // port ID
    channelID,
    clienttypes.Height{},
    timeout,
    packetData,
  )
  return err
}
\`\`\`

---

## ICS 标准速查

| 标准 | 内容 | 状态 |
|------|------|------|
| **ICS-20** | Fungible Token Transfer（跨链转账）| 生产级 |
| **ICS-27** | Interchain Accounts（跨链账户）| 生产级 |
| **ICS-29** | Fee Middleware（中继费用）| 生产级 |
| **ICS-721** | NFT Transfer | 草案 |
| **ICS-31** | Cross-chain Queries | 草案 |

---

## ICS-27 跨链账户（Interchain Accounts）

\`\`\`go
// 在 Host Chain 上注册跨链账户
func (k Keeper) RegisterInterchainAccount(ctx sdk.Context, connectionID, owner string) error {
  return k.icaControllerKeeper.RegisterInterchainAccount(ctx, connectionID, owner, "")
}

// 通过跨链账户执行交易（在 Host Chain 上）
func (k Keeper) SendInterchainTx(ctx sdk.Context, connectionID, owner string, msgs []sdk.Msg) error {
  data, err := icatypes.SerializeCosmosTx(k.cdc, msgs)
  if err != nil { return err }

  packetData := icatypes.InterchainAccountPacketData{
    Type: icatypes.EXECUTE_TX,
    Data: data,
  }

  _, err = k.icaControllerKeeper.SendTx(ctx, nil, connectionID, owner, packetData, timeout)
  return err
}
\`\`\`

---

## 开发工具

| 工具 | 用途 |
|------|------|
| **Ignite CLI** | Cosmos SDK 脚手架（\`ignite scaffold chain\`）|
| **Hermes** | Rust 中继器，性能最强 |
| **go-relayer** | Go 中继器，官方维护 |
| **CosmJS** | 前端 JavaScript SDK |
| **Lens** | 跨链查询工具 |
| **Starship** | 本地多链测试环境 |

\`\`\`bash
# 快速启动
ignite scaffold chain mychain --no-module
ignite scaffold module mymodule --ibc
ignite chain serve
\`\`\`
`,
},

// ============================================================
// 2. Starknet / Cairo 开发
// ============================================================
{
  id: 'starknet/cairo-dev-guide',
  name: 'Starknet Cairo 开发指南',
  description: 'Use when user asks about Starknet development, Cairo language, how to write Starknet contracts, deploy on Starknet, StarknetJS, or Starknet account abstraction.',
  ecosystem: 'starknet', type: 'guide', source: 'community', confidence: 'high',
  tags: ['starknet', 'cairo', 'zk-rollup', 'account-abstraction', 'felt', 'starknetjs'],
  content: `# Starknet Cairo 开发指南

## 为什么选 Starknet？

- **ZK Rollup**：所有交易由 STARK 证明验证，安全性来自数学而非博弈论
- **原生 AA**：所有账户都是合约账户（无 EOA 概念）
- **Cairo VM**：专为可验证计算设计，独立于 EVM
- **低 gas**：计算密集型任务比以太坊便宜 10-100x

---

## Cairo 语言基础

\`\`\`rust
// Cairo 2.x 语法（类 Rust）
use starknet::ContractAddress;

#[starknet::contract]
mod ERC20 {
  use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};

  #[storage]
  struct Storage {
    name: ByteArray,
    total_supply: u256,
    balances: Map<ContractAddress, u256>,
    allowances: Map<(ContractAddress, ContractAddress), u256>,
  }

  #[event]
  #[derive(Drop, starknet::Event)]
  enum Event {
    Transfer: Transfer,
  }

  #[derive(Drop, starknet::Event)]
  struct Transfer {
    #[key]
    from: ContractAddress,
    #[key]
    to: ContractAddress,
    value: u256,
  }

  #[abi(embed_v0)]
  impl ERC20Impl of super::IERC20<ContractState> {
    fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
      self.balances.read(account)
    }

    fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
      let sender = starknet::get_caller_address();
      let sender_balance = self.balances.read(sender);
      assert(sender_balance >= amount, 'Insufficient balance');
      
      self.balances.write(sender, sender_balance - amount);
      self.balances.write(recipient, self.balances.read(recipient) + amount);
      
      self.emit(Transfer { from: sender, to: recipient, value: amount });
      true
    }
  }
}
\`\`\`

---

## 与 EVM 的关键差异

| 概念 | EVM/Solidity | Starknet/Cairo |
|------|-------------|----------------|
| 基础类型 | uint256 | felt252（252 位字段元素）|
| 存储 | mapping | Map<K, V> |
| 账户 | EOA + 合约 | **全部是合约** |
| 事件 | event | #[event] + #[derive] |
| 构造函数 | constructor | #[constructor] |
| 继承 | is | 组合 + 接口 |
| msg.sender | msg.sender | get_caller_address() |
| address | address | ContractAddress |

---

## OpenZeppelin Cairo 组件

\`\`\`toml
# Scarb.toml
[dependencies]
openzeppelin = { git = "https://github.com/OpenZeppelin/cairo-contracts.git", tag = "v0.15.0" }
\`\`\`

\`\`\`rust
#[starknet::contract]
mod MyToken {
  use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
  use starknet::ContractAddress;

  component!(path: ERC20Component, storage: erc20, event: ERC20Event);

  #[abi(embed_v0)]
  impl ERC20Impl = ERC20Component::ERC20Impl<ContractState>;
  #[abi(embed_v0)]
  impl ERC20MetadataImpl = ERC20Component::ERC20MetadataImpl<ContractState>;
  impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

  #[storage]
  struct Storage {
    #[substorage(v0)]
    erc20: ERC20Component::Storage,
  }

  #[constructor]
  fn constructor(ref self: ContractState, recipient: ContractAddress) {
    self.erc20.initializer("MyToken", "MTK");
    self.erc20.mint(recipient, 1000000000000000000000000); // 1M tokens
  }
}
\`\`\`

---

## 部署流程

\`\`\`bash
# 安装工具
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
pip install starknet-devnet

# 新建项目
scarb new my_contract
cd my_contract && scarb build

# 本地测试网
starknet-devnet --seed 0

# 使用 sncast 部署
sncast --account my_account declare --contract-name MyContract
sncast --account my_account deploy --class-hash 0x...
\`\`\`

---

## Starknet.js 前端集成

\`\`\`bash
npm install starknet
\`\`\`

\`\`\`typescript
import { RpcProvider, Account, Contract, cairo } from "starknet"

// 连接 Provider
const provider = new RpcProvider({ nodeUrl: "https://starknet-mainnet.public.blastapi.io" })

// 连接钱包（ArgentX / Braavos）
const { account } = await window.starknet.enable()

// 调用合约
const contract = new Contract(ABI, contractAddress, account)

// 读取
const balance = await contract.balanceOf(address)

// 写入（invoke）
const tx = await contract.transfer(recipient, cairo.uint256(1000n))
await provider.waitForTransaction(tx.transaction_hash)
\`\`\`

---

## 账户抽象（原生支持）

Starknet 上所有账户都是合约，天生支持：
- **自定义签名方案**（ECDSA / WebAuthn / 多签）
- **Session Keys**（用户授权应用临时操作权限）
- **Paymaster**（代付 gas，用任意 token 付费）
- **多调用**（一次签名执行多个操作）

\`\`\`typescript
// Starknet 原生多调用（不需要额外 SDK）
const multiCall = await account.execute([
  { contractAddress: tokenA, entrypoint: "approve", calldata: [spender, amount] },
  { contractAddress: dex, entrypoint: "swap", calldata: [tokenA, tokenB, amount] },
])
\`\`\`

## 工具生态
| 工具 | 用途 |
|------|------|
| **Scarb** | Cairo 包管理器 + 编译器 |
| **Starknet Foundry (snforge)** | 测试框架（类 Foundry）|
| **ArgentX / Braavos** | 主流钱包 |
| **Voyager** | 区块浏览器 |
| **starknet-devnet** | 本地测试网 |
| **Katana** | Dojo 出品的本地节点 |
`,
},

// ============================================================
// 3. Move 生态完整指南（补充 Aptos/Sui 整合视角）
// ============================================================
{
  id: 'move/ecosystem-guide',
  name: 'Move 生态开发指南：Aptos vs Sui 对比',
  description: 'Use when user asks about Move language development, differences between Aptos and Sui, Move resource model, how to write Move smart contracts, or choosing between Move-based blockchains.',
  ecosystem: 'multi', type: 'guide', source: 'community', confidence: 'high',
  tags: ['move', 'aptos', 'sui', 'resource', 'object-model', 'comparison'],
  content: `# Move 生态开发指南：Aptos vs Sui

## Move 语言核心特性

Move 由 Meta（Diem 项目）创建，专为安全资产管理设计：

- **资源（Resource）类型**：不能被复制或丢弃，只能移动 → 天然防止双花
- **线性类型系统**：编译器级别保证资产安全
- **模块系统**：代码组织为 module，资源只能由定义它的 module 创建/销毁
- **形式化验证**：Move Prover 可对合约进行数学证明

---

## Aptos vs Sui 关键差异

| 维度 | Aptos | Sui |
|------|-------|-----|
| **数据模型** | Account-based（资源存在账户下）| Object-based（每个对象独立存储）|
| **并发** | 顺序执行（Block-STM 乐观并发）| 对象级并行（真正高并发）|
| **Move 版本** | Move（Meta 原版，稍改）| Move（大幅改造，Sui Move）|
| **存储费用** | 按字节收取存储押金 | 按对象收存储费 |
| **TPS** | ~160,000（理论）| ~297,000（理论）|
| **NFT 模型** | Token V2（可扩展）| Sui Object（原生对象）|
| **DeFi 生态** | Thala / Pancake / Aries | Cetus / Turbos / Navi |
| **开发工具** | Aptos CLI + TS SDK | Sui CLI + TS/Rust SDK |

---

## Aptos Move 合约

\`\`\`move
module my_addr::coin_example {
  use std::signer;
  use aptos_framework::coin::{Self, Coin};

  // 资源：只能 move，不能 copy/drop
  struct MyCoin has key, store {
    value: u64,
  }

  // 初始化（部署时自动调用）
  fun init_module(deployer: &signer) {
    // 注册为 CoinType
  }

  public entry fun mint(account: &signer, amount: u64) {
    let addr = signer::address_of(account);
    if (!exists<MyCoin>(addr)) {
      move_to(account, MyCoin { value: 0 });
    };
    let coin = borrow_global_mut<MyCoin>(addr);
    coin.value = coin.value + amount;
  }

  public entry fun transfer(from: &signer, to: address, amount: u64) {
    let from_addr = signer::address_of(from);
    let from_coin = borrow_global_mut<MyCoin>(from_addr);
    assert!(from_coin.value >= amount, 1); // E_INSUFFICIENT
    from_coin.value = from_coin.value - amount;

    if (!exists<MyCoin>(to)) {
      // 需要 to 账户先注册（Aptos 特有）
    };
    let to_coin = borrow_global_mut<MyCoin>(to);
    to_coin.value = to_coin.value + amount;
  }
}
\`\`\`

---

## Sui Move 合约（Object 模型）

\`\`\`move
module my_package::nft {
  use sui::object::{Self, UID};
  use sui::transfer;
  use sui::tx_context::{Self, TxContext};
  use std::string::{Self, String};

  // Sui 中每个资源都是 Object（有 UID）
  public struct NFT has key, store {
    id: UID,
    name: String,
    image_url: String,
  }

  // 创建 NFT 并发送给调用者
  public entry fun mint(name: vector<u8>, image_url: vector<u8>, ctx: &mut TxContext) {
    let nft = NFT {
      id: object::new(ctx),
      name: string::utf8(name),
      image_url: string::utf8(image_url),
    };
    transfer::public_transfer(nft, tx_context::sender(ctx));
  }

  // 转移
  public entry fun transfer_nft(nft: NFT, recipient: address) {
    transfer::public_transfer(nft, recipient);
  }
}
\`\`\`

---

## Aptos TypeScript SDK

\`\`\`bash
npm install @aptos-labs/ts-sdk
\`\`\`

\`\`\`typescript
import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk"

const config = new AptosConfig({ network: Network.MAINNET })
const aptos = new Aptos(config)

// 查询余额
const balance = await aptos.getAccountAPTAmount({ accountAddress: address })

// 发送交易
const account = Account.fromPrivateKey({ privateKey })
const tx = await aptos.transaction.build.simple({
  sender: account.accountAddress,
  data: {
    function: "0x1::aptos_account::transfer",
    functionArguments: [recipientAddress, 100000000n],  // 1 APT = 1e8
  },
})
const { hash } = await aptos.signAndSubmitTransaction({ signer: account, transaction: tx })
await aptos.waitForTransaction({ transactionHash: hash })
\`\`\`

---

## Sui TypeScript SDK

\`\`\`bash
npm install @mysten/sui
\`\`\`

\`\`\`typescript
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"

const client = new SuiClient({ url: getFullnodeUrl("mainnet") })

// 构建交易
const tx = new Transaction()
const [coin] = tx.splitCoins(tx.gas, [1000000000n])  // 1 SUI
tx.transferObjects([coin], recipientAddress)

// 签名发送
const keypair = Ed25519Keypair.fromSecretKey(privateKey)
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
})
\`\`\`

---

## 选链建议

\`\`\`
你的场景是什么？
│
├─ 游戏 / 高频链上操作（需要高并发）
│   → Sui（对象并行，天然适合游戏资产）
│
├─ DeFi 协议（需要现有流动性）
│   → Aptos（Thala/Aries 生态更成熟）
│
├─ NFT / 数字藏品
│   → Sui（Object 模型原生支持复杂 NFT 属性）
│
├─ 企业级 / 合规需求
│   → Aptos（与 Google Cloud / Microsoft 有合作）
│
└─ 学习 Move
    → 从 Aptos 开始（文档更全，原版 Move）
\`\`\`

## 资源
- Aptos 文档：aptos.dev
- Sui 文档：docs.sui.io
- Move Book：move-book.com
- Aptos Learn：learn.aptoslabs.com
`,
},

// ============================================================
// 4. TON 开发指南（补完）
// ============================================================
{
  id: 'ton/development-guide',
  name: 'TON 开发指南：FunC / Tact / Blueprint',
  description: 'Use when user asks about TON blockchain development, FunC or Tact language, TON smart contracts, Telegram Mini Apps integration, Jettons, or TON Connect.',
  ecosystem: 'ton', type: 'guide', source: 'community', confidence: 'high',
  tags: ['ton', 'func', 'tact', 'blueprint', 'telegram', 'jetton', 'ton-connect', 'mini-apps'],
  content: `# TON 开发指南

## TON 特点

- **Telegram 深度整合**：8 亿+ Telegram 用户，TON Space 内置钱包
- **异步架构**：合约通过消息通信，不同于 EVM 同步调用
- **分片链**：无限水平扩展，每个合约有独立状态
- **Jetton**：TON 的 FT 标准（类 ERC-20，但实现差异大）

---

## 合约语言选择

| 语言 | 特点 | 推荐 |
|------|------|------|
| **FunC** | 底层，接近汇编，现有合约大多用此 | 理解原理 |
| **Tact** | 高级语言，类 TypeScript，安全简洁 | **新项目首选** |
| **Blueprint** | 开发框架（脚手架 + 测试）| 必用 |

---

## Tact 合约示例

\`\`\`typescript
// counter.tact
import "@stdlib/deploy";

contract Counter with Deployable {
  owner: Address;
  counter: Int as uint32;

  init(owner: Address) {
    self.owner = owner;
    self.counter = 0;
  }

  receive("increment") {
    self.counter += 1;
  }

  receive(msg: ChangeOwner) {
    require(sender() == self.owner, "Only owner");
    self.owner = msg.newOwner;
  }

  get fun counter(): Int {
    return self.counter;
  }

  get fun owner(): Address {
    return self.owner;
  }
}

message ChangeOwner {
  newOwner: Address;
}
\`\`\`

---

## Blueprint 项目

\`\`\`bash
# 创建项目
npm create ton@latest my-project -- --type tact-counter
cd my-project && npm install

# 编译
npx blueprint build

# 测试
npx blueprint test

# 部署（需要配置钱包）
npx blueprint run
\`\`\`

### 测试示例

\`\`\`typescript
import { Blockchain, SandboxContract } from "@ton/sandbox"
import { Counter } from "../wrappers/Counter"
import { toNano } from "@ton/core"
import "@ton/test-utils"

describe("Counter", () => {
  let blockchain: Blockchain
  let counter: SandboxContract<Counter>

  beforeEach(async () => {
    blockchain = await Blockchain.create()
    const deployer = await blockchain.treasury("deployer")
    counter = blockchain.openContract(await Counter.fromInit(deployer.address))
    await counter.send(deployer.getSender(), { value: toNano("0.05") }, { $$type: "Deploy", queryId: 0n })
  })

  it("should increment", async () => {
    const user = await blockchain.treasury("user")
    await counter.send(user.getSender(), { value: toNano("0.01") }, "increment")
    expect(await counter.getCounter()).toBe(1n)
  })
})
\`\`\`

---

## Jetton（TON 代币标准）

TON Jetton 与 ERC-20 最大区别：**每个钱包地址有独立的 JettonWallet 合约**。

\`\`\`
Jetton Master (代币信息)
  ├── JettonWallet(Alice)  ← Alice 的余额存在这里
  ├── JettonWallet(Bob)
  └── JettonWallet(DEX)
\`\`\`

\`\`\`typescript
// @ton/ton SDK
import { JettonMaster, JettonWallet } from "@ton/ton"

const client = new TonClient({ endpoint: "https://toncenter.com/api/v2/jsonRPC" })
const jettonMaster = client.open(JettonMaster.create(masterAddress))

// 获取用户的 JettonWallet 地址
const walletAddress = await jettonMaster.getWalletAddress(userAddress)
const jettonWallet = client.open(JettonWallet.create(walletAddress))

// 查询余额
const { balance } = await jettonWallet.getWalletData()

// 转账（发送消息给自己的 JettonWallet）
const tx = internal({
  to: walletAddress,
  value: toNano("0.05"),  // gas
  body: JettonWallet.transferMessage(amount, recipient, responseAddress, null, toNano("0.01"), null),
})
\`\`\`

---

## TON Connect（钱包连接）

\`\`\`bash
npm install @tonconnect/ui-react
\`\`\`

\`\`\`tsx
import { TonConnectUIProvider, TonConnectButton, useTonConnectUI } from "@tonconnect/ui-react"

// App.tsx
<TonConnectUIProvider manifestUrl="https://your-app.com/tonconnect-manifest.json">
  <YourApp />
</TonConnectUIProvider>

// 使用
function App() {
  const [tonConnectUI] = useTonConnectUI()
  
  const sendTx = async () => {
    await tonConnectUI.sendTransaction({
      messages: [{
        address: recipientAddress,
        amount: toNano("0.1").toString(),
      }],
    })
  }
  
  return <TonConnectButton />  // 自动处理 Telegram 内置钱包 + TON Space
}
\`\`\`

### tonconnect-manifest.json
\`\`\`json
{
  "url": "https://your-app.com",
  "name": "My TON App",
  "iconUrl": "https://your-app.com/icon.png"
}
\`\`\`

---

## Telegram Mini Apps 集成

\`\`\`typescript
import { retrieveLaunchParams } from "@telegram-apps/sdk"

// 获取 Telegram 用户信息（已通过 Telegram 验证）
const { initDataRaw, initData } = retrieveLaunchParams()
const user = initData?.user  // { id, firstName, lastName, username }

// 打开 TON Space 支付
import { openLink } from "@telegram-apps/sdk"
openLink("ton://transfer/" + address + "?amount=" + amount + "&text=Payment")
\`\`\`

## 工具生态
| 工具 | 用途 |
|------|------|
| **Blueprint** | 开发框架（必用）|
| **TON Center** | 公共 API 节点 |
| **Tonviewer** | 区块浏览器 |
| **TON Space** | Telegram 内置钱包 |
| **Tonkeeper** | 主流独立钱包 |
| **GetGems** | NFT 市场 |
`,
},

// ============================================================
// 5. Polkadot / Substrate 开发
// ============================================================
{
  id: 'polkadot/substrate-dev-guide',
  name: 'Polkadot Substrate 开发指南',
  description: 'Use when user asks about Polkadot development, Substrate framework, parachain development, ink! smart contracts, XCM cross-chain messaging, or building on Polkadot ecosystem.',
  ecosystem: 'polkadot', type: 'guide', source: 'community', confidence: 'high',
  tags: ['polkadot', 'substrate', 'parachain', 'ink', 'xcm', 'rust', 'pallet'],
  content: `# Polkadot Substrate 开发指南

## Polkadot 架构

\`\`\`
Polkadot Relay Chain（安全共识层）
  ├── Parachain A（自定义链）
  ├── Parachain B（EVM 兼容，如 Moonbeam）
  ├── Parachain C（智能合约，如 Astar）
  └── ...（最多 100 个平行链）

XCM（跨链消息）连接所有平行链
\`\`\`

---

## 两种开发路径

| 路径 | 适合 | 技术 |
|------|------|------|
| **ink! 智能合约** | DApp 开发者，快速部署 | Rust + Wasm |
| **Substrate Pallet** | 协议/链开发者，深度定制 | Rust |

---

## ink! 智能合约（推荐入门）

\`\`\`rust
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod erc20 {
  use ink::storage::Mapping;

  #[ink(storage)]
  pub struct Erc20 {
    total_supply: Balance,
    balances: Mapping<AccountId, Balance>,
    allowances: Mapping<(AccountId, AccountId), Balance>,
  }

  #[ink(event)]
  pub struct Transfer {
    #[ink(topic)]
    from: Option<AccountId>,
    #[ink(topic)]
    to: Option<AccountId>,
    value: Balance,
  }

  impl Erc20 {
    #[ink(constructor)]
    pub fn new(total_supply: Balance) -> Self {
      let mut balances = Mapping::default();
      let caller = Self::env().caller();
      balances.insert(caller, &total_supply);
      Self::env().emit_event(Transfer { from: None, to: Some(caller), value: total_supply });
      Self { total_supply, balances, allowances: Default::default() }
    }

    #[ink(message)]
    pub fn balance_of(&self, owner: AccountId) -> Balance {
      self.balances.get(owner).unwrap_or_default()
    }

    #[ink(message)]
    pub fn transfer(&mut self, to: AccountId, value: Balance) -> Result<(), Error> {
      let from = self.env().caller();
      let from_balance = self.balance_of(from);
      if from_balance < value { return Err(Error::InsufficientBalance) }
      self.balances.insert(from, &(from_balance - value));
      let to_balance = self.balance_of(to);
      self.balances.insert(to, &(to_balance + value));
      self.env().emit_event(Transfer { from: Some(from), to: Some(to), value });
      Ok(())
    }
  }

  #[derive(Debug, PartialEq, Eq)]
  #[ink::scale_derive(Encode, Decode, TypeInfo)]
  pub enum Error { InsufficientBalance }
}
\`\`\`

---

## ink! 开发工具链

\`\`\`bash
# 安装
rustup component add rust-src
cargo install --force --locked cargo-contract

# 创建项目
cargo contract new my_contract
cd my_contract

# 编译（生成 .contract 文件）
cargo contract build --release

# 测试
cargo test

# 部署（到 Contracts UI 或命令行）
cargo contract instantiate --constructor new --args 1000000 --suri //Alice
\`\`\`

---

## Substrate Pallet（构建链逻辑）

\`\`\`rust
// pallets/my-pallet/src/lib.rs
#[frame_support::pallet]
pub mod pallet {
  use frame_support::pallet_prelude::*;
  use frame_system::pallet_prelude::*;

  #[pallet::pallet]
  pub struct Pallet<T>(_);

  // 配置接口
  #[pallet::config]
  pub trait Config: frame_system::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    type MaxValue: Get<u32>;
  }

  // 链上存储
  #[pallet::storage]
  pub type Something<T> = StorageValue<_, u32>;

  // 事件
  #[pallet::event]
  #[pallet::generate_deposit(pub(super) fn deposit_event)]
  pub enum Event<T: Config> {
    SomethingStored { something: u32, who: T::AccountId },
  }

  // 错误
  #[pallet::error]
  pub enum Error<T> {
    NoneValue,
    StorageOverflow,
  }

  // 可调用函数
  #[pallet::call]
  impl<T: Config> Pallet<T> {
    #[pallet::call_index(0)]
    #[pallet::weight(T::DbWeight::get().writes(1))]
    pub fn do_something(origin: OriginFor<T>, something: u32) -> DispatchResult {
      let who = ensure_signed(origin)?;
      ensure!(something <= T::MaxValue::get(), Error::<T>::StorageOverflow);
      Something::<T>::put(something);
      Self::deposit_event(Event::SomethingStored { something, who });
      Ok(())
    }
  }
}
\`\`\`

---

## XCM（跨链消息）

\`\`\`rust
// 从 Parachain 向 Relay Chain 发送 DOT
let dest = Location::parent();  // 上级 = Relay Chain
let beneficiary = Location::new(0, [AccountId32 { id: account.into(), network: None }]);
let assets = Assets::from((Here, 1_000_000_000u128));  // 1 DOT

let xcm = Xcm(vec![
  WithdrawAsset(assets.clone()),
  InitiateReserveWithdraw { assets, reserve: dest.clone(), xcm: Xcm(vec![
    BuyExecution { fees: (Here, 1_000_000u128).into(), weight_limit: Unlimited },
    DepositAsset { assets: Wild(AllCounted(1)), beneficiary },
  ])},
]);
\`\`\`

---

## 部署平行链步骤

1. **注册 ParaID**（在 Rococo 测试网）
2. **准备创世状态**（\`genesis-state\` + \`genesis-wasm\`）
3. **赢得 Slot 拍卖**（众贷 DOT）或租用 Parathread
4. **连接 Collator 节点**

\`\`\`bash
# 生成创世文件
./target/release/parachain-template-node export-genesis-state > genesis-state
./target/release/parachain-template-node export-genesis-wasm > genesis-wasm
\`\`\`

## 工具生态
| 工具 | 用途 |
|------|------|
| **Substrate Node Template** | 链开发脚手架 |
| **Contracts UI** | ink! 合约部署 UI |
| **Polkadot.js** | 官方 JS SDK + 钱包 |
| **Subscan** | 区块浏览器 |
| **Chopsticks** | 本地 fork 测试 |
| **Pop CLI** | 平行链开发脚手架（新）|
`,
},

]

async function main() {
  console.log(`Writing ${SKILLS.length} P2 ecosystem skills...`)
  let written = 0
  for (const s of SKILLS) {
    const ok = await upsert(s)
    console.log((ok ? '✅' : '❌') + ' ' + s.id)
    if (ok) written++
    await sleep(100)
  }

  const fin = await fetch(BASE + '/rest/v1/skills?select=type&limit=2000', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  const all = await fin.json()
  const c = {}
  for (const s of all) c[s.type] = (c[s.type]||0)+1
  console.log(`\nDone: ${written}/${SKILLS.length}`)
  console.log('DB total:', all.length)
  for (const [t,n] of Object.entries(c).sort((a,b)=>b[1]-a[1])) console.log(' ', t+':', n)
}

main().catch(console.error)
