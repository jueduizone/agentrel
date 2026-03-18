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
feedback_endpoint: https://agentrel.vercel.app/api/feedback
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
feedback_endpoint: https://agentrel.vercel.app/api/feedback
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
feedback_endpoint: https://agentrel.vercel.app/api/feedback
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
]

const BUNDLES: Omit<Bundle, 'created_at'>[] = [
  {
    id: 'web3-starter',
    name: 'Web3 Starter Bundle',
    description: '多链入门必备 Skills 包，覆盖 Ethereum 和 Solana 核心开发知识。',
    scenario: 'web3-dev',
    skills: ['ethereum/core', 'solana/web3js-v2'],
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
