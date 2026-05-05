import { serviceClient } from './supabase'
import type { Skill, Bundle } from './types'

const SOLANA_CONTENT = `---
id: solana/web3js-v2
name: Solana web3.js v2 Migration Guide
version: 1.0.0
ecosystem: solana
type: technical-doc
time_sensitivity: evergreen
source: community
confidence: high
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
Solana web3.js v2 是一次彻底的 API 重写，与 v1 不兼容。大多数 AI 仍然生成 v1 代码。
本 Skill 帮助你的 AI Agent 始终输出正确的 v2 代码。

## ⚠️ Gotchas（AI 最容易犯的错误）

### 1. Connection 已废弃，改用 createSolanaRpc
❌ v1 (错误):
\`\`\`typescript
import { Connection } from '@solana/web3.js';
const connection = new Connection('https://api.mainnet-beta.solana.com');
\`\`\`

✅ v2 (正确):
\`\`\`typescript
import { createSolanaRpc } from '@solana/web3.js';
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
\`\`\`

### 2. Keypair.generate() 已废弃
❌ v1:
\`\`\`typescript
const keypair = Keypair.generate();
\`\`\`

✅ v2:
\`\`\`typescript
import { generateKeyPair } from '@solana/web3.js';
const keypair = await generateKeyPair();
\`\`\`

### 3. PublicKey 处理方式变化
❌ v1:
\`\`\`typescript
new PublicKey('address...')
\`\`\`

✅ v2:
\`\`\`typescript
import { address } from '@solana/web3.js';
const addr = address('address...');
\`\`\`

### 4. Transaction 构建 API 完全不同
❌ v1:
\`\`\`typescript
const tx = new Transaction().add(instruction);
\`\`\`

✅ v2:
\`\`\`typescript
import {
  pipe,
  createTransactionMessage,
  appendTransactionMessageInstruction,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/web3.js';

const tx = pipe(
  createTransactionMessage({ version: 0 }),
  msg => setTransactionMessageFeePayerSigner(signer, msg),
  msg => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msg),
  msg => appendTransactionMessageInstruction(instruction, msg),
);
\`\`\`

## 安装
\`\`\`bash
npm install @solana/web3.js@2
\`\`\`

## 参考资源
- [官方迁移指南](https://solana-labs.github.io/solana-web3.js/)
- [v2 示例仓库](https://github.com/solana-labs/solana-web3.js/tree/main/examples)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="solana/web3js-v2", issue="<description>", code_snippet="<optional>", error_message="<optional>", fix="<optional>")
`

const ETHEREUM_CONTENT = `---
id: ethereum/core
name: Ethereum Core Development
version: 1.0.0
ecosystem: ethereum
type: technical-doc
time_sensitivity: evergreen
source: official
confidence: high
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
Ethereum is the world's leading smart contract platform. This skill covers core development patterns, common AI mistakes, and best practices for building on Ethereum with modern tooling (ethers.js v6, Hardhat, OpenZeppelin).

## ⚠️ Gotchas (Common AI Mistakes)

### 1. Use ethers.js v6, not v5
❌ Outdated (ethers v5):
\`\`\`typescript
import { ethers } from 'ethers';
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
\`\`\`

✅ Current (ethers v6):
\`\`\`typescript
import { ethers } from 'ethers';
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
\`\`\`

### 2. BigNumber → Native BigInt
❌ v5:
\`\`\`typescript
const value = ethers.BigNumber.from('1000000000000000000');
const doubled = value.mul(2);
\`\`\`

✅ v6:
\`\`\`typescript
const value = ethers.parseEther('1.0'); // returns bigint
const doubled = value * 2n;
\`\`\`

### 3. Contract factory deployment
✅ v6:
\`\`\`typescript
const factory = new ethers.ContractFactory(abi, bytecode, signer);
const contract = await factory.deploy(constructorArg);
await contract.waitForDeployment();
const address = await contract.getAddress();
\`\`\`

## Smart Contract Best Practices

### Use OpenZeppelin for security primitives
\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
}
\`\`\`

## Installation
\`\`\`bash
npm install ethers
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
\`\`\`

## Reference
- [Ethereum Developer Docs](https://ethereum.org/developers)
- [ethers.js v6 Migration Guide](https://docs.ethers.org/v6/migrating/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Docs](https://hardhat.org/docs)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="ethereum/core", issue="<description>")
`

const APTOS_CONTENT = `---
id: aptos/move-dev
name: Aptos Move Development
version: 1.0.0
ecosystem: aptos
type: technical-doc
time_sensitivity: evergreen
source: community
confidence: medium
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
Aptos is a Layer 1 blockchain using the Move programming language. Move provides resource-oriented programming with linear types and strong safety guarantees. Most AI generates outdated or incorrect Aptos code using the deprecated \`aptos\` package.

## ⚠️ Gotchas (Common AI Mistakes)

### 1. Use @aptos-labs/ts-sdk, not the old aptos package
❌ Outdated:
\`\`\`typescript
import { AptosClient, AptosAccount } from 'aptos';
const client = new AptosClient('https://fullnode.mainnet.aptoslabs.com');
\`\`\`

✅ Current:
\`\`\`typescript
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
const config = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(config);
\`\`\`

### 2. Resource structs need abilities
❌ Wrong (plain struct cannot be stored globally):
\`\`\`move
struct Counter {
    value: u64,
}
\`\`\`

✅ Correct (with key ability for global storage):
\`\`\`move
struct Counter has key {
    value: u64,
}
\`\`\`

### 3. Module address format
❌ Wrong:
\`\`\`move
module MyModule {
\`\`\`

✅ Correct:
\`\`\`move
module my_addr::my_module {
\`\`\`

### 4. Entry functions for user transactions
\`\`\`move
public entry fun increment(account: &signer) acquires Counter {
    let counter_ref = borrow_global_mut<Counter>(signer::address_of(account));
    counter_ref.value = counter_ref.value + 1;
}
\`\`\`

## TypeScript SDK Example
\`\`\`typescript
import { Aptos, AptosConfig, Network, Account } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Create account
const account = Account.generate();

// Fund on testnet
await aptos.fundAccount({
  accountAddress: account.accountAddress,
  amount: 100_000_000,
});

// Submit transaction
const transaction = await aptos.transaction.build.simple({
  sender: account.accountAddress,
  data: {
    function: '0x1::coin::transfer',
    typeArguments: ['0x1::aptos_coin::AptosCoin'],
    functionArguments: [recipientAddress, 1000],
  },
});

const { hash } = await aptos.signAndSubmitTransaction({
  signer: account,
  transaction,
});
\`\`\`

## Installation
\`\`\`bash
npm install @aptos-labs/ts-sdk
aptos init
aptos move init --name my_project
\`\`\`

## Reference
- [Aptos Developer Docs](https://aptos.dev)
- [Move Language Book](https://move-book.com)
- [Aptos TypeScript SDK](https://aptos-labs.github.io/aptos-ts-sdk/)
- [Aptos Explorer](https://explorer.aptoslabs.com)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="aptos/move-dev", issue="<description>")
`

const SUI_CONTENT = `---
id: sui/move-dev
name: Sui Move Development
version: 1.0.0
ecosystem: sui
type: technical-doc
time_sensitivity: evergreen
source: community
confidence: medium
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
Sui 是 Mysten Labs 开发的 Layer 1 区块链，使用 Move 语言。Sui Move 与 Aptos Move 有重要差异：Sui 是**对象中心**模型，Aptos 是**账户中心**模型。AI 经常混淆两者，本 Skill 帮助你生成正确的 Sui Move 代码。

## ⚠️ Gotchas（AI 最容易犯的错误）

### 1. Sui 对象模型 vs Aptos 资源模型
❌ 错误（照搬 Aptos 风格，用全局存储）:
\`\`\`move
module my_addr::counter {
    struct Counter has key {
        value: u64,
    }
    public entry fun increment(account: &signer) acquires Counter {
        let c = borrow_global_mut<Counter>(signer::address_of(account));
        c.value = c.value + 1;
    }
}
\`\`\`

✅ 正确（Sui 对象风格，对象作为参数传入）:
\`\`\`move
module my_pkg::counter {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;

    public struct Counter has key {
        id: UID,
        value: u64,
    }

    public entry fun increment(counter: &mut Counter, _ctx: &mut TxContext) {
        counter.value = counter.value + 1;
    }
}
\`\`\`

### 2. 对象创建必须用 object::new，返回给调用者
❌ 错误（没有返回对象）:
\`\`\`move
public entry fun create(ctx: &mut TxContext) {
    let c = Counter { id: object::new(ctx), value: 0 };
    // 对象被丢弃，会编译报错
}
\`\`\`

✅ 正确（transfer 给发送者）:
\`\`\`move
use sui::transfer;
use sui::tx_context;

public entry fun create(ctx: &mut TxContext) {
    let c = Counter { id: object::new(ctx), value: 0 };
    transfer::transfer(c, tx_context::sender(ctx));
}
\`\`\`

### 3. 使用 @mysten/sui 而非旧版 @mysten/sui.js
❌ 旧版（已废弃）:
\`\`\`typescript
import { JsonRpcProvider } from '@mysten/sui.js';
const provider = new JsonRpcProvider('https://fullnode.mainnet.sui.io');
\`\`\`

✅ 当前版本:
\`\`\`typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
\`\`\`

### 4. 签名和提交交易
\`\`\`typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const keypair = new Ed25519Keypair();

const tx = new Transaction();
tx.moveCall({
  target: \`\${PACKAGE_ID}::counter::increment\`,
  arguments: [tx.object(COUNTER_ID)],
});

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
});
\`\`\`

## 对象所有权类型
- **Owned Object**（\`transfer::transfer\`）：单地址拥有，最常见
- **Shared Object**（\`transfer::share_object\`）：所有人可访问，需要共识
- **Frozen Object**（\`transfer::freeze_object\`）：不可变，任何人可读

## Installation
\`\`\`bash
npm install @mysten/sui
# CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
\`\`\`

## Reference
- [Sui Developer Docs](https://docs.sui.io)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Sui Move by Example](https://examples.sui.io)
- [Sui Explorer](https://suiexplorer.com)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="sui/move-dev", issue="<description>", code_snippet="<optional>", error_message="<optional>", fix="<optional>")
`

const TON_CONTENT = `---
id: ton/tact-dev
name: TON + Tact Development
version: 1.0.0
ecosystem: ton
type: technical-doc
time_sensitivity: evergreen
source: community
confidence: medium
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
TON（The Open Network）是高性能 Layer 1 区块链，使用 Cell/Slice 数据结构。Tact 是面向 TON 的高级合约语言，比 FunC 更易读。@ton/ton 是官方 TypeScript SDK。AI 常常混用 FunC 和 Tact 语法，或使用过时的 tonweb 库。

## ⚠️ Gotchas（AI 最容易犯的错误）

### 1. 使用 @ton/ton 而非旧版 tonweb
❌ 旧版（已废弃）:
\`\`\`typescript
import TonWeb from 'tonweb';
const tonweb = new TonWeb();
\`\`\`

✅ 当前版本:
\`\`\`typescript
import { TonClient, WalletContractV4, internal } from '@ton/ton';
const client = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: 'YOUR_API_KEY',
});
\`\`\`

### 2. Tact 合约结构（不是 Solidity 也不是 FunC）
❌ 错误（用 Solidity 风格）:
\`\`\`solidity
pragma solidity ^0.8.0;
contract Counter {
    uint256 public value;
    function increment() public { value++; }
}
\`\`\`

✅ 正确（Tact 语法）:
\`\`\`tact
contract Counter {
    value: Int as uint64 = 0;

    receive("increment") {
        self.value += 1;
    }

    get fun value(): Int {
        return self.value;
    }
}
\`\`\`

### 3. Cell/Slice 序列化（TON 的核心数据模型）
\`\`\`typescript
import { Cell, beginCell, Address } from '@ton/core';

// 构建 Cell（序列化）
const cell = beginCell()
  .storeUint(0x18, 6)          // flags
  .storeAddress(recipientAddr)  // 目标地址
  .storeCoins(toNano('0.05'))   // 金额（nanoTON）
  .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
  .storeRef(
    beginCell().storeUint(0, 32).storeStringTail('hello').endCell()
  )
  .endCell();

// 读取 Slice（反序列化）
const slice = cell.beginParse();
const flags = slice.loadUint(6);
const addr = slice.loadAddress();
\`\`\`

### 4. 发送内部消息
\`\`\`typescript
import { TonClient, WalletContractV4, internal, toNano } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
const wallet = WalletContractV4.create({
  publicKey: keyPair.publicKey,
  workchain: 0,
});

const contract = client.open(wallet);
await contract.sendTransfer({
  seqno: await contract.getSeqno(),
  secretKey: keyPair.secretKey,
  messages: [
    internal({
      to: recipientAddress,
      value: toNano('0.05'),
      body: 'Hello TON',
    }),
  ],
});
\`\`\`

## Tact 消息处理模式
\`\`\`tact
message Deposit {
    amount: Int as coins;
}

contract Vault {
    totalDeposit: Int as coins = 0;

    receive(msg: Deposit) {
        require(msg.amount > 0, "Amount must be positive");
        self.totalDeposit += msg.amount;
        // 退回多余的 gas
        self.reply("Deposited".asComment());
    }

    get fun totalDeposit(): Int {
        return self.totalDeposit;
    }
}
\`\`\`

## Installation
\`\`\`bash
npm install @ton/ton @ton/core @ton/crypto
# Tact 编译器
npm install -g @tact-lang/compiler
# Blueprint 脚手架（推荐）
npm create ton@latest
\`\`\`

## Reference
- [TON Developer Docs](https://docs.ton.org)
- [Tact Language Docs](https://docs.tact-lang.org)
- [Blueprint Framework](https://github.com/ton-org/blueprint)
- [TON Center API](https://toncenter.com/api/v2/)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="ton/tact-dev", issue="<description>", code_snippet="<optional>", error_message="<optional>", fix="<optional>")
`

const STARKNET_CONTENT = `---
id: starknet/cairo
name: StarkNet + Cairo 1.0 Development
version: 1.0.0
ecosystem: starknet
type: technical-doc
time_sensitivity: evergreen
source: community
confidence: medium
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
StarkNet 是基于 STARK 证明的以太坊 ZK-Rollup。Cairo 1.0 是其原生智能合约语言（类 Rust 语法）。AI 经常生成旧版 Cairo 0（Python 风格）代码，或错误使用 starknet.js v4 而非 v6 API。

## ⚠️ Gotchas（AI 最容易犯的错误）

### 1. Cairo 0 vs Cairo 1.0（完全不同的语言）
❌ 旧版 Cairo 0（Python 风格，已废弃）:
\`\`\`cairo
%builtins output
from starkware.cairo.common.serialize import serialize_word
func main(output_ptr: felt*) -> (output_ptr: felt*) {
    serialize_word(output_ptr, 42);
    return (output_ptr=output_ptr + 1);
}
\`\`\`

✅ 当前 Cairo 1.0（Rust 风格）:
\`\`\`rust
#[starknet::contract]
mod Counter {
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        value: u64,
    }

    #[abi(embed_v0)]
    impl CounterImpl of super::ICounter<ContractState> {
        fn increment(ref self: ContractState) {
            self.value.write(self.value.read() + 1);
        }

        fn get_value(self: @ContractState) -> u64 {
            self.value.read()
        }
    }
}
\`\`\`

### 2. 使用 starknet.js v6，不是 v4/v5
❌ 旧版（v4/v5 已废弃）:
\`\`\`typescript
import { Provider, Contract } from 'starknet';
const provider = new Provider({ sequencer: { network: 'mainnet-alpha' } });
\`\`\`

✅ 当前版本（v6）:
\`\`\`typescript
import { RpcProvider, Contract, Account, stark } from 'starknet';
const provider = new RpcProvider({
  nodeUrl: 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7',
});
\`\`\`

### 3. Interface 定义是必须的
\`\`\`rust
#[starknet::interface]
trait ICounter<TContractState> {
    fn increment(ref self: TContractState);
    fn get_value(self: @TContractState) -> u64;
}
\`\`\`

### 4. Events 定义（Cairo 1.0 风格）
\`\`\`rust
#[event]
#[derive(Drop, starknet::Event)]
enum Event {
    ValueChanged: ValueChanged,
}

#[derive(Drop, starknet::Event)]
struct ValueChanged {
    #[key]
    caller: ContractAddress,
    new_value: u64,
}
\`\`\`

## TypeScript 交互示例
\`\`\`typescript
import { RpcProvider, Account, Contract, stark, uint256 } from 'starknet';

const provider = new RpcProvider({
  nodeUrl: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7',
});

const account = new Account(
  provider,
  '0xYOUR_ACCOUNT_ADDRESS',
  '0xYOUR_PRIVATE_KEY'
);

const contract = new Contract(abi, contractAddress, account);

// 调用只读方法
const value = await contract.get_value();

// 发送交易
const { transaction_hash } = await contract.invoke('increment', []);
await provider.waitForTransaction(transaction_hash);
\`\`\`

## 合约声明和部署
\`\`\`typescript
import { RpcProvider, Account, DeclareContractPayload } from 'starknet';

// 声明合约（上传 Sierra + CASM）
const declareResponse = await account.declare({
  contract: sierraJson,
  casm: casmJson,
});
await provider.waitForTransaction(declareResponse.transaction_hash);

// 部署合约
const deployResponse = await account.deployContract({
  classHash: declareResponse.class_hash,
  constructorCalldata: [],
});
\`\`\`

## Installation
\`\`\`bash
# Scarb (Cairo 包管理器)
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
# starknet.js
npm install starknet
# Starknet Foundry (测试)
curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh
\`\`\`

## Reference
- [StarkNet Developer Docs](https://docs.starknet.io)
- [Cairo Book](https://book.cairo-lang.org)
- [starknet.js v6 Docs](https://starknetjs.com)
- [Scarb Docs](https://docs.swmansion.com/scarb)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="starknet/cairo", issue="<description>", code_snippet="<optional>", error_message="<optional>", fix="<optional>")
`

const BASE_CONTENT = `---
id: base/l2-dev
name: Base L2 Development
version: 1.0.0
ecosystem: base
type: technical-doc
time_sensitivity: evergreen
source: official
confidence: high
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
Base 是 Coinbase 基于 OP Stack 构建的以太坊 Layer 2 网络。它完全兼容 EVM，但有若干重要差异需要注意。AI 常常忽略 L2 特有的 gas 计算、跨链桥逻辑，或使用缺失 Base 特定功能的通用以太坊代码。

## ⚠️ Gotchas（AI 最容易犯的错误）

### 1. Gas 价格：L2 手续费 + L1 数据费
❌ 错误（只看 L2 gas price）:
\`\`\`typescript
const gasPrice = await provider.getGasPrice();
const gasCost = gasLimit * gasPrice; // 不准确！
\`\`\`

✅ 正确（需计算 L1 data fee）:
\`\`\`typescript
// Base 的总费用 = L2 execution fee + L1 data fee
// L1 data fee 通过预编译合约查询
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http() });

// 使用 viem 内置的 L2 gas 估算
import { estimateTotalFee } from 'viem/op-stack';
const totalFee = await estimateTotalFee(client, { account, to, data });
\`\`\`

### 2. 使用 viem + wagmi（Coinbase 推荐工具链）
\`\`\`typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http('https://mainnet.base.org'),
});
\`\`\`

### 3. 使用 OnchainKit 快速构建 Base 应用
\`\`\`typescript
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';

function App() {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
    >
      {/* 你的应用 */}
    </OnchainKitProvider>
  );
}
\`\`\`

### 4. 跨链 Bridge：Standard Bridge vs 第三方
\`\`\`typescript
// 官方 Standard Bridge（L1 → L2，约 1-3 分钟）
import { getL2TransactionHashes, publicActionsL1 } from 'viem/op-stack';
import { mainnet } from 'viem/chains';

const l1Client = createPublicClient({ chain: mainnet, transport: http() })
  .extend(publicActionsL1());

// 发起存款
const hash = await walletClient.depositTransaction({
  request: {
    to: recipientOnL2,
    value: parseEther('0.01'),
    gas: 21000n,
  },
});

// L2 → L1 提款需要 7 天挑战期（OP Stack 安全机制）
// 使用第三方 bridge（如 Across、Stargate）可绕过等待期
\`\`\`

## RPC 端点
\`\`\`
Mainnet: https://mainnet.base.org
Testnet (Sepolia): https://sepolia.base.org
Chainlink: Chain ID 8453 (mainnet), 84532 (testnet)
\`\`\`

## Base Name Service（Basename）
\`\`\`typescript
import { getName } from '@coinbase/onchainkit/identity';

// 解析地址对应的 Basename
const name = await getName({
  address: '0x...',
  chain: base,
});
// 返回 'user.base.eth' 或 null
\`\`\`

## Installation
\`\`\`bash
npm install viem wagmi @coinbase/onchainkit
# Hardhat 配置
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
\`\`\`

\`\`\`typescript
// hardhat.config.ts
networks: {
  base: {
    url: 'https://mainnet.base.org',
    accounts: [process.env.PRIVATE_KEY!],
    chainId: 8453,
  },
  baseSepolia: {
    url: 'https://sepolia.base.org',
    accounts: [process.env.PRIVATE_KEY!],
    chainId: 84532,
  },
}
\`\`\`

## Reference
- [Base Developer Docs](https://docs.base.org)
- [OnchainKit Docs](https://onchainkit.xyz)
- [viem OP Stack](https://viem.sh/op-stack)
- [Base Bridge](https://bridge.base.org)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="base/l2-dev", issue="<description>", code_snippet="<optional>", error_message="<optional>", fix="<optional>")
`

const GRANT_WRITING_CONTENT = `---
id: grants/web3-grant-writing
name: Web3 Grant Writing Guide
version: 1.0.0
ecosystem: cross-chain
type: guide
time_sensitivity: evergreen
source: community
confidence: medium
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
Web3 生态有大量基金会 Grant 资助机会，但大多数申请因结构不清或未击中评审重点而被拒。本指南提供通用写作框架、评审标准解析及常见拒稿原因，适用于 Solana Foundation、Ethereum ESP、Sui Foundation、TON Foundation 等主流 Grant 项目。

## Grant 申请通用结构

### 标准五段式结构
\`\`\`markdown
## 1. Problem Statement（问题陈述）
- 清晰描述你解决的具体问题
- 量化问题规模（DAU/TVL 数据、痛点案例）
- 为什么现有解决方案不够好

## 2. Solution（解决方案）
- 你的技术/产品方案
- 与现有方案的差异化
- 为什么你的团队能做成

## 3. Impact（影响力）
- 对生态的贡献（开发者、用户、TVL）
- 可量化的目标指标（KPI）
- 时间线（通常 3-6 个月）

## 4. Milestones（里程碑）
- 分阶段交付，每阶段有明确产出
- 与资金拨付挂钩
- 示例：M1（4周）= 技术架构文档 + Alpha版本

## 5. Budget（预算）
- 按里程碑分配预算
- 合理的人力成本（市场价）
- 基础设施/工具费用
\`\`\`

## ⚠️ 常见拒稿原因

### 1. 问题/解决方案不匹配
❌ 错误：描述了一个很大的问题，但方案只解决了很小一部分
✅ 正确：问题范围与方案能力精确匹配

### 2. 缺少生态关联性
❌ 错误："我们要做一个好用的 DeFi 平台"
✅ 正确："我们要为 Solana 上的长尾代币提供深度流动性，解决现有 DEX 滑点问题（数据：过去30天，市值<100M 代币平均滑点 3.2%）"

### 3. 里程碑不可验证
❌ 错误：M1 = "完成产品研发"
✅ 正确：M1 = "部署到 Testnet，通过安全审计，集成 3 个合作协议，MAU > 500"

### 4. 团队背景缺失
必须包含：
- 核心成员 GitHub 链接（展示技术能力）
- 相关项目经验（特别是同生态的贡献）
- 过去的 Grant 履约记录（如有）

### 5. 预算不透明
❌ 错误：总预算 $50,000（无明细）
✅ 正确：
- 开发人力（2名工程师 × 3个月）：$36,000
- 审计费用：$8,000
- 服务器和工具：$2,000
- 社区活动：$4,000

## 评审标准权重（通用）
| 维度 | 权重 | 说明 |
|------|------|------|
| 技术可行性 | 30% | 团队能否实现，架构是否合理 |
| 生态影响力 | 25% | 对生态开发者/用户的实际贡献 |
| 团队能力 | 20% | 过往经验，GitHub 活跃度 |
| 里程碑清晰度 | 15% | 是否可验证，时间线是否合理 |
| 预算合理性 | 10% | 性价比，资金用途是否聚焦 |

## Milestone 模板
\`\`\`markdown
### Milestone 1（第 1-4 周）：基础架构
**交付物**：
- [ ] 技术设计文档（含架构图）
- [ ] 核心模块代码（GitHub 开源）
- [ ] 单元测试覆盖率 > 80%

**验收标准**：代码可在本地运行，文档完整
**预算**：$X,XXX

### Milestone 2（第 5-10 周）：Beta 发布
**交付物**：
- [ ] 部署到 Testnet
- [ ] 用户文档 + Demo 视频
- [ ] Beta 用户：≥ 50 人

**验收标准**：可公开访问，收到用户反馈
**预算**：$X,XXX
\`\`\`

## 提交前检查清单
- [ ] 问题有数据支撑
- [ ] 方案有技术细节（不只是愿景）
- [ ] 里程碑每个都有可验证的交付物
- [ ] 团队成员有 GitHub/LinkedIn 链接
- [ ] 预算有逐项明细
- [ ] 说明了为什么要在这条链上做

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="grants/web3-grant-writing", issue="<description>", fix="<optional>")
`

const SOLANA_GRANT_CONTENT = `---
id: grants/solana-foundation
name: Solana Foundation Grant Guide
version: 1.0.0
ecosystem: solana
type: guide
time_sensitivity: time-sensitive
source: community
confidence: medium
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
Solana Foundation 通过多个渠道资助生态项目，包括 Solana Foundation Delegation（验证节点资助）、Developer Grants（开发者工具/基础设施）及 Ecosystem Grants。本指南针对开发者工具和生态项目的申请。

## 主要资助渠道

### 1. Solana Foundation Developer Grants
- **目标**：开源基础设施、开发者工具、教育内容
- **金额**：通常 $5,000 – $100,000（视项目规模）
- **申请入口**：https://solana.org/grants
- **周期**：滚动接收，约 4-6 周评审

### 2. Solana Hackathon（周期性）
- 奖金池通常 $500,000+
- Colosseum 是官方合作平台：https://www.colosseum.org
- 特点：快速验证想法，获得可见度

## ⚠️ 常见错误与注意事项

### 1. 必须是 Solana 生态专属贡献
❌ 通用 Web3 工具申请 Solana Grant
✅ 明确说明为什么在 Solana 上做，用了哪些 Solana 特性（高速低费、Turbine、Firedancer 等）

### 2. Developer Grants 优先开源项目
❌ 闭源商业产品
✅ MIT 或 Apache 2.0 开源，GitHub 公开仓库

### 3. 重视 Solana 生态贡献历史
如有以下记录会大幅加分：
- 在 Solana Stack Exchange 回答问题
- 贡献 solana-web3.js 或 Anchor 框架
- 发布 Solana 相关技术文章
- 参与过 Solana Hackathon

## 评审重点维度

| 维度 | 说明 |
|------|------|
| **Solana-Native** | 是否充分利用 Solana 特性（Parallel execution、State Compression、cNFT 等） |
| **开发者影响** | 能否帮助更多开发者在 Solana 上构建 |
| **可持续性** | 项目有无自我维持的商业模式或社区 |
| **技术质量** | 代码质量、架构设计、文档完整性 |
| **团队执行力** | 过往履约记录，GitHub 活跃度 |

## 申请结构（Solana 特化版）

\`\`\`markdown
## Project Description
[简短描述，1-2段，包含核心价值主张]

## Problem
[具体的 Solana 生态问题，最好有数据：活跃开发者数量、现有工具痛点等]

## Solution
[技术方案，说明如何利用 Solana 特性：
- 使用了哪些 Solana 程序（如 Token Program、Metaplex、cNFT）
- 性能优势来自哪里]

## Impact on Solana Ecosystem
[量化目标：
- 预计影响的开发者数量
- GitHub star 目标
- 文档/教程覆盖范围]

## Milestones & Budget
| Milestone | Deliverables | Timeline | Budget |
|-----------|--------------|----------|--------|
| M1 | ... | Week 1-4 | $X,XXX |
| M2 | ... | Week 5-10 | $X,XXX |

## Team
[成员 + GitHub + 相关经验]

## Prior Work
[过去的 Solana 贡献，Hackathon 参与记录]
\`\`\`

## Milestone 示例（SDK 工具类项目）

\`\`\`markdown
### M1（第 1-4 周）：核心功能
- Solana web3.js v2 完整类型封装
- 10+ 单元测试，覆盖主要 RPC 方法
- README + QuickStart 文档
- npm 包发布（alpha 版本）
预算：$8,000（1名工程师 × 4周）

### M2（第 5-8 周）：稳定版发布
- 集成测试（Devnet 环境）
- 完整 API 文档（TypeDoc）
- 5+ 社区项目实际使用案例
- npm 周下载量 > 200
预算：$6,000
\`\`\`

## 申请前准备
1. GitHub 仓库已存在（即使是空的也要先创建）
2. 技术设计文档（PDF 或公开 Notion/HackMD）
3. 团队成员 Solana 生态贡献记录
4. 如有 MVP/Demo，录制 3-5 分钟演示视频

## Reference
- [Solana Foundation Grants](https://solana.org/grants)
- [Colosseum Hackathon](https://www.colosseum.org)
- [Solana Developer Resources](https://solana.com/developers)
- [Solana Stack Exchange](https://solana.stackexchange.com)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="grants/solana-foundation", issue="<description>", fix="<optional>")
`

const ETHEREUM_ESP_CONTENT = `---
id: grants/ethereum-esp
name: Ethereum ESP Grant Guide
version: 1.0.0
ecosystem: ethereum
type: guide
time_sensitivity: time-sensitive
source: community
confidence: medium
maintainer: AgentRel Community
last_updated: 2026-03-19
feedback_endpoint: https://agent.openbuild.xyz/api/feedback
---

## Overview
ESP（Ecosystem Support Program）是以太坊基金会（EF）的官方资助项目，支持提升以太坊生态整体发展的开源工作。ESP 以支持公共物品（Public Goods）著称，不适合商业产品，但非常适合基础设施、研究、开发者工具和教育内容。

## ESP 核心原则（申请前必读）

### EF 资助什么
✅ 开源基础设施（节点客户端、开发工具、库）
✅ 协议研究（密码学、共识机制、EIP 实现）
✅ 开发者教育（文档、课程、Workshop）
✅ 社区基础设施（本地 Ethereum 社区建设）
✅ Layer 2 公共物品（非商业性跨链基础设施）

### EF 不资助什么
❌ 有明确商业盈利目标的产品
❌ 已经有 VC 融资且盈利的项目
❌ 单纯的营销/品牌推广活动
❌ 与 EF 利益冲突的竞争性项目

## ⚠️ 常见申请错误

### 1. 把商业产品包装成公共物品
❌ 错误："我们的 DeFi 协议是开源的，所以是公共物品"
✅ 正确：公共物品应该是非竞争性的、无法排他的——例如任何人都能免费使用的开发者工具库

### 2. 申请金额与工作量不匹配
ESP 对预算非常敏感。常见失败：
- $200,000 申请只有 2 个月工作
- 没有详细的人力成本分解

### 3. 忽略以太坊核心价值
申请必须体现以下之一：
- 增强以太坊去中心化
- 提升以太坊安全性
- 改善以太坊可及性（开发者体验、用户体验）

## ESP 申请类型

### Small Grants（快速通道）
- 金额：通常 $10,000 – $30,000
- 适合：个人贡献者、小团队、教育内容
- 评审时间：约 4-6 周
- 申请入口：https://esp.ethereum.foundation/applicants/small-grants

### Project Grants
- 金额：$30,000+（无上限，大型项目可达数百万）
- 适合：持续 6个月+ 的重要基础设施工作
- 评审时间：2-4 个月
- 需要更详细的技术设计和里程碑

### Academic Grants
- 面向高校研究人员
- 支持与以太坊相关的密码学、经济学、协议研究

## 评审标准

| 维度 | 权重 | 说明 |
|------|------|------|
| **以太坊价值对齐** | 35% | 是否真正服务以太坊生态，而非个人利益 |
| **公共物品属性** | 25% | 开源程度，非商业性，可及性 |
| **技术质量** | 20% | 方案可行性，团队技术能力 |
| **影响范围** | 15% | 影响以太坊生态的广度和深度 |
| **可持续性** | 5% | Grant 结束后如何维持 |

## 申请结构（ESP 特化版）

\`\`\`markdown
## Project Overview
[1段话：做什么，为什么对以太坊重要]

## Problem
[当前以太坊生态中存在的具体缺口，
引用数据或具体案例说明痛点的真实性]

## Proposed Solution
[技术方案，强调：
1. 开源策略（许可证、维护计划）
2. 与以太坊核心技术的关系（EIP、客户端、L2 标准等）]

## Impact on Ethereum Ecosystem
[具体、可量化的影响：
- 覆盖多少开发者
- 减少多少开发摩擦（以具体指标衡量）
- 是否与其他生态项目协同]

## Milestones
[按月分解，每个里程碑有可验证产出]

## Budget Breakdown
| Item | Hours/Units | Rate | Total |
|------|-------------|------|-------|
| Lead Developer | 400h | $100/h | $40,000 |
| Technical Writing | 80h | $75/h | $6,000 |
| Infrastructure | - | - | $2,000 |
| **Total** | | | **$48,000** |

## Team
[成员 + GitHub + 以太坊生态贡献记录（EIP 参与、Core Dev 会议、客户端贡献等）]

## Open Source Plan
[仓库地址/规划、许可证、长期维护策略]
\`\`\`

## Grantee 经验总结

### 提升通过率的策略
1. **先参与社区**：在 ETHResearch、Protocol calls 中出现，建立可信度
2. **小额先行**：先申请 Small Grant，成功后申请大额
3. **EF 关系网络**：通过 Devconnect、Devcon 认识 ESP 团队成员
4. **透明进度更新**：在 GitHub 和 Twitter 上公开记录工作进展

### 提交后流程
1. 初步审查（1-2周）：确认符合基本条件
2. 技术评审（2-4周）：EF 技术团队评估
3. 可能的面试（30-60分钟视频通话）
4. Offer 或反馈（如被拒，通常有改进建议）

## Reference
- [ESP 官网](https://esp.ethereum.foundation)
- [ESP Small Grants](https://esp.ethereum.foundation/applicants/small-grants)
- [以往资助项目案例](https://esp.ethereum.foundation/grantees)
- [ETH Research Forum](https://ethresear.ch)
- [Ethereum Foundation Blog](https://blog.ethereum.org)

## Feedback
If this skill contains incorrect or outdated information, call:
agentrel_feedback(skill="grants/ethereum-esp", issue="<description>", fix="<optional>")
`

const SKILLS: Omit<Skill, 'created_at' | 'updated_at'>[] = [
  {
    id: 'solana/web3js-v2',
    name: 'Solana web3.js v2 Migration Guide',
    ecosystem: 'solana',
    type: 'technical-doc',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'community',
    confidence: 'high',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: SOLANA_CONTENT,
    tags: ['solana', 'web3js', 'migration', 'v2'],
  },
  {
    id: 'ethereum/core',
    name: 'Ethereum Core Development',
    ecosystem: 'ethereum',
    type: 'technical-doc',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'official',
    confidence: 'high',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: ETHEREUM_CONTENT,
    tags: ['ethereum', 'solidity', 'evm', 'ethers'],
  },
  {
    id: 'aptos/move-dev',
    name: 'Aptos Move Development',
    ecosystem: 'aptos',
    type: 'technical-doc',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'community',
    confidence: 'medium',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: APTOS_CONTENT,
    tags: ['aptos', 'move', 'smart-contract'],
  },
  {
    id: 'sui/move-dev',
    name: 'Sui Move Development',
    ecosystem: 'sui',
    type: 'technical-doc',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'community',
    confidence: 'medium',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: SUI_CONTENT,
    tags: ['sui', 'move', 'smart-contract', 'object-model'],
  },
  {
    id: 'ton/tact-dev',
    name: 'TON + Tact Development',
    ecosystem: 'ton',
    type: 'technical-doc',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'community',
    confidence: 'medium',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: TON_CONTENT,
    tags: ['ton', 'tact', 'cell', 'slice', 'smart-contract'],
  },
  {
    id: 'starknet/cairo',
    name: 'StarkNet + Cairo 1.0 Development',
    ecosystem: 'starknet',
    type: 'technical-doc',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'community',
    confidence: 'medium',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: STARKNET_CONTENT,
    tags: ['starknet', 'cairo', 'zk-rollup', 'stark'],
  },
  {
    id: 'base/l2-dev',
    name: 'Base L2 Development',
    ecosystem: 'base',
    type: 'technical-doc',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'official',
    confidence: 'high',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: BASE_CONTENT,
    tags: ['base', 'l2', 'op-stack', 'coinbase', 'evm'],
  },
  {
    id: 'grants/web3-grant-writing',
    name: 'Web3 Grant Writing Guide',
    ecosystem: 'cross-chain',
    type: 'guide',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'community',
    confidence: 'medium',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: GRANT_WRITING_CONTENT,
    tags: ['grants', 'funding', 'web3', 'writing', 'milestones'],
  },
  {
    id: 'grants/solana-foundation',
    name: 'Solana Foundation Grant Guide',
    ecosystem: 'solana',
    type: 'guide',
    time_sensitivity: 'time-sensitive',
    expires_at: null,
    source: 'community',
    confidence: 'medium',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: SOLANA_GRANT_CONTENT,
    tags: ['grants', 'solana', 'funding', 'ecosystem'],
  },
  {
    id: 'grants/ethereum-esp',
    name: 'Ethereum ESP Grant Guide',
    ecosystem: 'ethereum',
    type: 'guide',
    time_sensitivity: 'time-sensitive',
    expires_at: null,
    source: 'community',
    confidence: 'medium',
    version: '1.0.0',
    source_repo: 'jueduizone/agentrel',
    maintainer: 'AgentRel Community',
    content: ETHEREUM_ESP_CONTENT,
    tags: ['grants', 'ethereum', 'esp', 'funding', 'public-goods'],
  },
]

const BUNDLES: Omit<Bundle, 'created_at'>[] = [
  {
    id: 'web3-starter',
    name: 'Web3 Starter Bundle',
    description: '多链入门必备 Skills 包，覆盖 Ethereum、Solana、Aptos 核心开发知识。',
    scenario: 'web3-dev',
    skills: ['ethereum/core', 'solana/web3js-v2', 'aptos/move-dev'],
    expires_at: null,
  },
  {
    id: 'multi-chain-dev',
    name: 'Multi-Chain Developer Bundle',
    description: '覆盖 Sui、TON、StarkNet、Base 的多链开发 Skills 包，适合构建跨链应用的开发者。',
    scenario: 'multi-chain',
    skills: ['sui/move-dev', 'ton/tact-dev', 'starknet/cairo', 'base/l2-dev'],
    expires_at: null,
  },
  {
    id: 'grant-hunter',
    name: 'Web3 Grant Hunter Bundle',
    description: 'Web3 Grant 申请完整指南，包含通用写作方法论及 Solana Foundation、Ethereum ESP 的专项攻略。',
    scenario: 'grant-writing',
    skills: ['grants/web3-grant-writing', 'grants/solana-foundation', 'grants/ethereum-esp'],
    expires_at: null,
  },
]

export async function seedDatabase() {
  const results: string[] = []

  // Upsert skills
  for (const skill of SKILLS) {
    const { error } = await serviceClient
      .from('skills')
      .upsert(skill, { onConflict: 'id' })

    if (error) {
      results.push(`❌ skill ${skill.id}: ${error.message}`)
    } else {
      results.push(`✅ skill ${skill.id}`)
    }
  }

  // Upsert bundles
  for (const bundle of BUNDLES) {
    const { error } = await serviceClient
      .from('bundles')
      .upsert(bundle, { onConflict: 'id' })

    if (error) {
      results.push(`❌ bundle ${bundle.id}: ${error.message}`)
    } else {
      results.push(`✅ bundle ${bundle.id}`)
    }
  }

  return results
}
