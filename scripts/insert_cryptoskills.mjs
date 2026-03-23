import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zkpeutvzmrfhlzpsbyhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI'
)

const BASE = 'https://raw.githubusercontent.com/0xinit/cryptoskills/main/skills'

const skills = [
  // Dev Tools
  { name: 'Foundry', ecosystem: 'Multichain', type: 'dev-tools', tags: ['foundry','solidity','testing','evm'], content: 'Foundry toolkit for Solidity development — forge (build/test), cast (chain interaction), anvil (local node), and chisel (REPL). Covers project setup, testing patterns (unit, fuzz, invariant, fork), deployment via forge script, contract verification, gas optimization, and debugging. Works on any EVM chain.', slug: 'foundry' },
  { name: 'Hardhat', ecosystem: 'Multichain', type: 'dev-tools', tags: ['hardhat','solidity','testing','evm'], content: 'Hardhat Solidity development framework — project setup, plugin ecosystem, testing with Mocha/Chai, deployment with Hardhat Ignition, contract verification, Hardhat Network forking, TypeScript configuration, and custom task creation. Works on any EVM chain.', slug: 'hardhat' },
  { name: 'viem', ecosystem: 'Multichain', type: 'dev-tools', tags: ['viem','typescript','ethereum','evm'], content: 'TypeScript interface for Ethereum and EVM chains. Use for reading blockchain state, sending transactions, interacting with contracts, encoding/decoding ABI data, and building dApp backends. Transport-based architecture with full type safety over ABIs.', slug: 'viem' },
  { name: 'wagmi', ecosystem: 'Multichain', type: 'dev-tools', tags: ['wagmi','react','ethereum','frontend'], content: 'wagmi React hooks for Ethereum — createConfig, useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, wallet connectors, SSR/Next.js patterns, and TanStack Query integration. Build type-safe dApp frontends with viem under the hood.', slug: 'wagmi' },
  { name: 'ethers.js', ecosystem: 'Multichain', type: 'dev-tools', tags: ['ethers','typescript','ethereum'], content: 'ethers.js v6 TypeScript/JavaScript Ethereum library — Provider, Signer, Contract interaction, ABI encoding/decoding, event filters, ENS resolution, and BigNumber-to-bigint migration from v5.', slug: 'ethers-js' },
  { name: 'EVM Testing', ecosystem: 'Multichain', type: 'dev-tools', tags: ['testing','foundry','hardhat','evm'], content: 'Comprehensive testing patterns for EVM smart contracts. Covers unit tests, fuzz testing, invariant testing, fork testing, and gas optimization with Foundry and Hardhat.', slug: 'evm-testing' },
  { name: 'OpenZeppelin', ecosystem: 'Multichain', type: 'infrastructure', tags: ['openzeppelin','solidity','erc20','erc721','security'], content: 'OpenZeppelin Contracts v5 for building secure smart contracts. Covers ERC-20/721/1155 tokens, access control (Ownable, AccessControl, AccessManager), security utilities (ReentrancyGuard, Pausable, SafeERC20), upgradeable contracts (UUPS, Initializable).', slug: 'openzeppelin' },
  { name: 'Scaffold-ETH 2', ecosystem: 'Ethereum', type: 'dev-tools', tags: ['scaffold-eth','dapp','fullstack','ethereum'], content: 'Full-stack dApp development framework — quick start with npx create-eth@latest, Foundry/Hardhat monorepo, custom React hooks, contract hot reload, auto-generated debug page, three-phase build (Local to Testnet to Production).', slug: 'scaffold-eth-2' },
  { name: 'Ethereum Concepts', ecosystem: 'Ethereum', type: 'overview', tags: ['ethereum','gas','evm','storage'], content: 'Core Ethereum development concepts including gas mechanics, transaction types, storage layout, ABI encoding, and EVM execution model. Use as a reference when building on Ethereum or EVM chains.', slug: 'eth-concepts' },
  { name: 'EIP Reference', ecosystem: 'Ethereum', type: 'reference', tags: ['eip','erc','ethereum','standards'], content: 'Ethereum Improvement Proposals and ERC standards reference — ERC-20, ERC-721, ERC-1155, ERC-4626, ERC-2981, EIP-712, EIP-1559, EIP-2612, EIP-4337, EIP-4844, EIP-7702, ERC-8004. Quick lookup, interface signatures, and implementation patterns.', slug: 'eip-reference' },
  { name: 'Contract Addresses', ecosystem: 'Multichain', type: 'reference', tags: ['addresses','contracts','evm','multichain'], content: 'Verified contract addresses for major EVM protocols across Ethereum, Arbitrum, Optimism, Base, and Polygon. Covers tokens, DEXes, lending, bridges, and infrastructure.', slug: 'contract-addresses' },
  { name: 'Solidity Security', ecosystem: 'Multichain', type: 'security', tags: ['security','solidity','audit','reentrancy'], content: 'Comprehensive Solidity security patterns, vulnerability prevention, and audit preparation. Covers reentrancy, access control, token decimals, oracle manipulation, vault inflation, proxy safety, EIP-712 signatures, MEV protection, and pre-deploy checklists.', slug: 'solidity-security' },
  { name: 'Frontend UX', ecosystem: 'Multichain', type: 'frontend', tags: ['frontend','ux','wallet','dapp'], content: 'dApp frontend UX patterns and production readiness — wallet connection flows (RainbowKit, multi-state), four-state transaction lifecycle, error handling taxonomy, gas estimation with USD display, network switching, approval patterns, mobile wallet support.', slug: 'frontend-ux' },
  { name: 'Account Abstraction', ecosystem: 'Multichain', type: 'infrastructure', tags: ['erc4337','account-abstraction','paymaster','bundler'], content: 'ERC-4337 and EIP-7702 unified reference — EntryPoint v0.7 architecture, UserOperation lifecycle, bundler and paymaster roles, EIP-7702 EOA delegation, paymaster patterns, permissionless.js SDK, ZeroDev Kernel, session keys (ERC-7579).', slug: 'account-abstraction' },
  { name: 'Safe Multisig', ecosystem: 'Multichain', type: 'infrastructure', tags: ['safe','multisig','gnosis','evm'], content: 'Safe (formerly Gnosis Safe) multisig SDK — deploying new Safes, proposing and confirming transactions, modules and guards, EIP-1271 signature validation, and Safe Transaction Service integration. Works on 15+ EVM chains.', slug: 'safe' },
  { name: 'The Graph', ecosystem: 'Multichain', type: 'infrastructure', tags: ['the-graph','indexing','subgraph','graphql'], content: 'The Graph decentralized indexing protocol — subgraph development (schema.graphql, AssemblyScript mappings, subgraph.yaml manifest), GraphQL queries, Subgraph Studio deployment, indexing optimization, and Graph Client for type-safe queries.', slug: 'the-graph' },
  { name: 'Chainlink', ecosystem: 'Multichain', type: 'infrastructure', tags: ['chainlink','oracle','vrf','ccip'], content: 'Chainlink oracle integration — price feeds (AggregatorV3Interface), VRF v2.5 verifiable randomness, Automation (Keepers) for conditional execution, and CCIP cross-chain messaging. Covers staleness checks, subscription management across Ethereum, Arbitrum, and Base.', slug: 'chainlink' },
  // L2 & Alt-L1
  { name: 'Arbitrum', ecosystem: 'Arbitrum', type: 'development', tags: ['arbitrum','l2','nitro','cross-chain'], content: 'Arbitrum Nitro L2 development — deployment, cross-chain messaging (Retryable Tickets), Orbit chains, ArbOS precompiles, bridging, and gas model differences from Ethereum.', slug: 'arbitrum' },
  { name: 'Base', ecosystem: 'Base', type: 'development', tags: ['base','l2','coinbase','op-stack'], content: 'Base L2 development (Coinbase) — deployment, OnchainKit, Paymaster (gasless transactions), Smart Wallet, Base Account SDK, and OP Stack integration. Built on Optimism\'s OP Stack.', slug: 'base' },
  { name: 'Optimism', ecosystem: 'Optimism', type: 'development', tags: ['optimism','l2','op-stack','superchain'], content: 'Optimism and OP Stack development — deployment, cross-chain messaging (CrossDomainMessenger), SuperchainERC20, predeploy contracts, gas model (L1 data fee + EIP-4844), and Superchain interop.', slug: 'optimism' },
  { name: 'Polygon', ecosystem: 'Polygon', type: 'development', tags: ['polygon','l2','zkevm','agglayer'], content: 'Polygon ecosystem development — PoS chain deployment, zkEVM patterns, AggLayer interop, POL token migration, and bridging across Polygon chains.', slug: 'polygon' },
  { name: 'StarkNet', ecosystem: 'StarkNet', type: 'development', tags: ['starknet','cairo','zk','l2'], content: 'StarkNet development with Cairo — smart contract patterns, native account abstraction, Scarb package manager, starknet.js integration, deployment, testing, and L1-L2 messaging.', slug: 'starknet' },
  { name: 'zkSync', ecosystem: 'zkSync', type: 'development', tags: ['zksync','zk','l2','paymaster'], content: 'zkSync Era development — ZK-specific deployment patterns, native account abstraction, paymasters for gasless transactions, system contracts, and EVM differences.', slug: 'zksync' },
  { name: 'Aptos', ecosystem: 'Aptos', type: 'development', tags: ['aptos','move','l1'], content: 'Aptos Move-based L1 development — Move modules with global storage, resource accounts, Aptos SDK (@aptos-labs/ts-sdk), Coin standard, Token V2 (Digital Assets), view functions, multi-agent transactions, gas estimation, and Block-STM parallel execution.', slug: 'aptos' },
  { name: 'Sui', ecosystem: 'Sui', type: 'development', tags: ['sui','move','l1','objects'], content: 'Sui Move-based L1 development — object-centric ownership model, Programmable Transaction Blocks (PTBs), Sui SDK (@mysten/sui), shared vs owned objects, Move module publishing, gas sponsorship, zkLogin authentication.', slug: 'sui' },
  // Protocols
  { name: 'Aave V3', ecosystem: 'Multichain', type: 'defi', tags: ['aave','lending','defi','evm'], content: 'Aave V3 lending protocol integration — supply, borrow, repay, withdraw, flash loans, E-Mode, and health factor monitoring. Covers IPool interface in Solidity and viem-based TypeScript for reading protocol state across Ethereum, Arbitrum, Optimism, Base, and Polygon.', slug: 'aave' },
  { name: 'Uniswap', ecosystem: 'Ethereum', type: 'defi', tags: ['uniswap','dex','v3','v4','liquidity'], content: 'Uniswap V3 and V4 DEX integration — exact input/output swaps via SwapRouter02 and UniversalRouter, concentrated liquidity positions via NonfungiblePositionManager, V4 hook architecture with PoolManager singleton, pool state reads, and Permit2 token approvals.', slug: 'uniswap' },
  { name: 'ENS', ecosystem: 'Ethereum', type: 'infrastructure', tags: ['ens','naming','ethereum'], content: 'ENS (Ethereum Name Service) development — name resolution, registration via commit-reveal, text/address records, reverse resolution, avatar retrieval, subdomains, and Name Wrapper integration.', slug: 'ens' },
  { name: 'Lido', ecosystem: 'Ethereum', type: 'defi', tags: ['lido','staking','steth','liquid-staking'], content: 'Lido liquid staking protocol — stake ETH to receive stETH, wrap to wstETH for DeFi composability, manage withdrawal queue requests, read share rates. Covers rebasing token pitfalls and wstETH/stETH conversion.', slug: 'lido' },
  { name: 'EigenLayer', ecosystem: 'Ethereum', type: 'infrastructure', tags: ['eigenlayer','restaking','avs','ethereum'], content: 'EigenLayer restaking protocol — stake ETH and LSTs to secure AVSs (Actively Validated Services), operator registration and delegation, reward claiming, and slashing conditions.', slug: 'eigenlayer' },
  { name: 'Farcaster', ecosystem: 'Multichain', type: 'social', tags: ['farcaster','social','frames','neynar'], content: 'Onchain social protocol with Neynar API, Frames v2 Mini Apps, and transaction frames. Covers Snapchain architecture, FID registry on OP Mainnet, and Warpcast integration.', slug: 'farcaster' },
  { name: 'LayerZero', ecosystem: 'Multichain', type: 'cross-chain', tags: ['layerzero','cross-chain','oft','messaging'], content: 'LayerZero V2 cross-chain messaging — OApp framework, OFT (Omnichain Fungible Token), DVN configuration, executor setup, message options, and cross-chain deployment patterns.', slug: 'layerzero' },
  { name: 'Wormhole', ecosystem: 'Multichain', type: 'cross-chain', tags: ['wormhole','cross-chain','ntt','vaa'], content: 'Wormhole cross-chain messaging and token transfers — NTT (Native Token Transfers) framework, VAA (Verified Action Approvals), guardian network, automatic and manual relayers, and Wormhole Queries for cross-chain reads.', slug: 'wormhole' },
  { name: 'x402', ecosystem: 'Multichain', type: 'ai-agents', tags: ['x402','payment','http402','ai-agents'], content: 'HTTP 402 payment protocol for AI agent commerce — three-actor model (Client, Resource Server, Facilitator), ERC-3009 transferWithAuthorization, server middleware, client patterns in TypeScript and Python, and agent-to-agent payments.', slug: 'x402' },
  { name: 'Privy', ecosystem: 'Multichain', type: 'frontend', tags: ['privy','wallet','auth','embedded-wallet'], content: 'Embedded wallet SDK for dApps with social login, email, and passkey auth. Covers React SDK, server-side JWT verification, wallet management, and smart wallet integration.', slug: 'privy' },
]

const rows = skills.map(s => ({
  name: s.name,
  ecosystem: s.ecosystem,
  type: s.type,
  time_sensitivity: 'stable',
  source: 'third-party',
  confidence: 'high',
  version: '1.0',
  source_repo: 'https://github.com/0xinit/cryptoskills',
  maintainer: '0xinit',
  content: s.content + `\n\nSkill URL: ${BASE}/${s.slug}/SKILL.md`,
  tags: s.tags,
}))

const { data, error } = await supabase.from('skills').insert(rows).select('id, name')
if (error) {
  console.error('Error:', error.message)
} else {
  console.log(`Inserted ${data.length} skills:`)
  data.forEach(r => console.log(` ✅ ${r.name}`))
}
